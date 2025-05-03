// server/controllers/client-controller.ts
import { Request, Response } from 'express';
import { db } from '../db';
import { clients, insertClientSchema, Client } from '@shared/schema';
import { eq, like, ilike, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Ottiene la lista dei clienti
export async function getClients(req: Request, res: Response) {
  try {
    const { search, active, limit, offset, sortBy, sortDirection } = req.query;
    
    // Costruisci la query di base
    let query = db.select().from(clients);
    
    // Applica i filtri se presenti
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(
        or(
          ilike(clients.name, searchTerm),
          ilike(clients.taxId, searchTerm),
          ilike(clients.email, searchTerm),
          ilike(clients.contactPerson, searchTerm)
        )
      );
    }
    
    if (active !== undefined) {
      const isActive = active === 'true';
      query = query.where(eq(clients.active, isActive));
    }
    
    // Applica ordinamento
    if (sortBy && typeof sortBy === 'string') {
      const direction = sortDirection === 'desc' ? desc : undefined;
      
      // Utilizza la colonna specificata per l'ordinamento
      switch (sortBy) {
        case 'name':
          query = query.orderBy(direction ? desc(clients.name) : clients.name);
          break;
        case 'createdAt':
          query = query.orderBy(direction ? desc(clients.createdAt) : clients.createdAt);
          break;
        case 'city':
          query = query.orderBy(direction ? desc(clients.city) : clients.city);
          break;
        default:
          query = query.orderBy(clients.name);
      }
    } else {
      // Ordinamento predefinito
      query = query.orderBy(clients.name);
    }
    
    // Applica paginazione
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string);
      const offsetNum = offset ? parseInt(offset as string) : 0;
      
      if (!isNaN(limitNum)) {
        query = query.limit(limitNum);
        if (!isNaN(offsetNum)) {
          query = query.offset(offsetNum);
        }
      }
    }
    
    const result = await query;
    
    res.json(result);
  } catch (error) {
    console.error('Errore nel recupero dei clienti:', error);
    res.status(500).json({ message: 'Errore nel recupero dei clienti', error: error.message });
  }
}

// Ottiene un cliente specifico per ID
export async function getClientById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const clientId = parseInt(id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'ID cliente non valido' });
    }
    
    const result = await db.select().from(clients).where(eq(clients.id, clientId));
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Cliente non trovato' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore nel recupero del cliente:', error);
    res.status(500).json({ message: 'Errore nel recupero del cliente', error: error.message });
  }
}

// Crea un nuovo cliente
export async function createClient(req: Request, res: Response) {
  try {
    // Validazione con Zod
    const validatedData = insertClientSchema.parse(req.body);
    
    // Inserimento nel database
    const result = await db.insert(clients).values({
      ...validatedData,
      updatedAt: new Date(),
    }).returning();
    
    res.status(201).json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dati del cliente non validi', 
        errors: error.errors 
      });
    }
    
    console.error('Errore nella creazione del cliente:', error);
    res.status(500).json({ message: 'Errore nella creazione del cliente', error: error.message });
  }
}

// Aggiorna un cliente esistente
export async function updateClient(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const clientId = parseInt(id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'ID cliente non valido' });
    }
    
    // Verifica se il cliente esiste
    const existingClient = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId));
    
    if (existingClient.length === 0) {
      return res.status(404).json({ message: 'Cliente non trovato' });
    }
    
    // Validazione con Zod
    const validatedData = insertClientSchema.parse(req.body);
    
    // Aggiornamento nel database
    const result = await db.update(clients).set({
      ...validatedData,
      updatedAt: new Date(),
    }).where(eq(clients.id, clientId)).returning();
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dati del cliente non validi', 
        errors: error.errors 
      });
    }
    
    console.error('Errore nell\'aggiornamento del cliente:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento del cliente', error: error.message });
  }
}

// Attiva/disattiva un cliente
export async function toggleClientStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const clientId = parseInt(id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'ID cliente non valido' });
    }
    
    // Recupera lo stato attuale del cliente
    const existingClient = await db.select({ active: clients.active }).from(clients).where(eq(clients.id, clientId));
    
    if (existingClient.length === 0) {
      return res.status(404).json({ message: 'Cliente non trovato' });
    }
    
    const currentActive = existingClient[0].active;
    
    // Inverte lo stato attivo/inattivo
    const result = await db.update(clients).set({
      active: !currentActive,
      updatedAt: new Date(),
    }).where(eq(clients.id, clientId)).returning();
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore nel cambio di stato del cliente:', error);
    res.status(500).json({ message: 'Errore nel cambio di stato del cliente', error: error.message });
  }
}

// Statistiche dei clienti
export async function getClientStats(req: Request, res: Response) {
  try {
    // Conteggio totale clienti
    const totalClientsResult = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const totalClients = totalClientsResult[0].count;
    
    // Conteggio clienti attivi
    const activeClientsResult = await db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.active, true));
    const activeClients = activeClientsResult[0].count;
    
    // Conteggio per tipo di cliente
    const clientTypeStatsResult = await db
      .select({
        clientType: clients.clientType,
        count: sql<number>`count(*)`
      })
      .from(clients)
      .groupBy(clients.clientType);
    
    const clientTypeStats = clientTypeStatsResult.reduce((acc, { clientType, count }) => {
      acc[clientType] = count;
      return acc;
    }, {} as Record<string, number>);
    
    // Risultato finale
    const stats = {
      totalClients,
      activeClients,
      inactiveClients: totalClients - activeClients,
      clientTypeStats
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Errore nel recupero delle statistiche dei clienti:', error);
    res.status(500).json({ message: 'Errore nel recupero delle statistiche dei clienti', error: error.message });
  }
}

// Elimina un cliente (solo se non ha ordini associati)
export async function deleteClient(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const clientId = parseInt(id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'ID cliente non valido' });
    }
    
    // TODO: Verifica se il cliente ha ordini associati
    // Implementare quando ci sarà la tabella degli ordini
    
    // Elimina il cliente
    const result = await db.delete(clients).where(eq(clients.id, clientId)).returning();
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Cliente non trovato' });
    }
    
    res.json({ message: 'Cliente eliminato con successo', client: result[0] });
  } catch (error) {
    console.error('Errore nell\'eliminazione del cliente:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione del cliente', error: error.message });
  }
}