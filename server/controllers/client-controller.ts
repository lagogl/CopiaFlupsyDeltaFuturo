import { Request, Response } from 'express';
import { db } from '../db';
import { clients, insertClientSchema } from '../../shared/schema';
import { eq, like, desc, count, sql, or, and, not } from 'drizzle-orm';
import { fromZodError } from 'zod-validation-error';

/**
 * Controller per la gestione dei clienti
 */
export class ClientController {
  /**
   * Ottiene l'elenco di tutti i clienti
   */
  static async getClients(req: Request, res: Response) {
    try {
      const { search, status } = req.query;
      let query = db.select().from(clients);

      // Filtro per stato (attivo/inattivo)
      if (status === 'active') {
        query = query.where(eq(clients.active, true));
      } else if (status === 'inactive') {
        query = query.where(eq(clients.active, false));
      }

      // Filtro per ricerca
      if (search && typeof search === 'string') {
        const searchTerm = `%${search}%`;
        query = query.where(
          or(
            like(clients.name, searchTerm),
            like(clients.taxId, searchTerm),
            like(clients.email, searchTerm),
            like(clients.contactPerson, searchTerm)
          )
        );
      }

      // Ordinamento (default: nome)
      query = query.orderBy(clients.name);

      const clientsList = await query;
      res.json(clientsList);
    } catch (error) {
      console.error('Errore nel recupero dei clienti:', error);
      res.status(500).json({ message: 'Errore nel recupero dei clienti' });
    }
  }

  /**
   * Ottiene un cliente specifico tramite ID
   */
  static async getClientById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const clientId = parseInt(id, 10);

      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'ID cliente non valido' });
      }

      const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

      if (!client) {
        return res.status(404).json({ message: 'Cliente non trovato' });
      }

      res.json(client);
    } catch (error) {
      console.error('Errore nel recupero del cliente:', error);
      res.status(500).json({ message: 'Errore nel recupero del cliente' });
    }
  }

  /**
   * Crea un nuovo cliente
   */
  static async createClient(req: Request, res: Response) {
    try {
      const validatedData = insertClientSchema.safeParse(req.body);

      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ message: validationError.message });
      }

      const [newClient] = await db.insert(clients).values({
        ...validatedData.data,
        updatedAt: new Date()
      }).returning();

      res.status(201).json(newClient);
    } catch (error) {
      console.error('Errore nella creazione del cliente:', error);
      res.status(500).json({ message: 'Errore nella creazione del cliente' });
    }
  }

  /**
   * Aggiorna un cliente esistente
   */
  static async updateClient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const clientId = parseInt(id, 10);

      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'ID cliente non valido' });
      }

      // Verifica se il cliente esiste
      const [existingClient] = await db.select().from(clients).where(eq(clients.id, clientId));

      if (!existingClient) {
        return res.status(404).json({ message: 'Cliente non trovato' });
      }

      // Valida i dati di aggiornamento
      const validatedData = insertClientSchema.partial().safeParse(req.body);

      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ message: validationError.message });
      }

      // Aggiorna il cliente
      const [updatedClient] = await db.update(clients)
        .set({
          ...validatedData.data,
          updatedAt: new Date()
        })
        .where(eq(clients.id, clientId))
        .returning();

      res.json(updatedClient);
    } catch (error) {
      console.error('Errore nell\'aggiornamento del cliente:', error);
      res.status(500).json({ message: 'Errore nell\'aggiornamento del cliente' });
    }
  }

  /**
   * Cambia lo stato di un cliente (attivo/inattivo)
   */
  static async toggleClientStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const clientId = parseInt(id, 10);

      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'ID cliente non valido' });
      }

      // Recupera lo stato attuale
      const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

      if (!client) {
        return res.status(404).json({ message: 'Cliente non trovato' });
      }

      // Inverte lo stato attivo
      const [updatedClient] = await db.update(clients)
        .set({
          active: !client.active,
          updatedAt: new Date()
        })
        .where(eq(clients.id, clientId))
        .returning();

      res.json(updatedClient);
    } catch (error) {
      console.error('Errore nella modifica dello stato del cliente:', error);
      res.status(500).json({ message: 'Errore nella modifica dello stato del cliente' });
    }
  }

  /**
   * Elimina un cliente
   */
  static async deleteClient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const clientId = parseInt(id, 10);

      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'ID cliente non valido' });
      }

      // Verifica se il cliente esiste
      const [existingClient] = await db.select().from(clients).where(eq(clients.id, clientId));

      if (!existingClient) {
        return res.status(404).json({ message: 'Cliente non trovato' });
      }

      // Eliminazione del cliente (in realtà dovremmo controllare se ha ordini associati)
      const [deletedClient] = await db.delete(clients)
        .where(eq(clients.id, clientId))
        .returning();

      res.json(deletedClient);
    } catch (error) {
      console.error('Errore nell\'eliminazione del cliente:', error);
      
      // Se l'errore è dovuto a vincoli di chiave esterna (ordini associati), restituisci un errore specifico
      if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
        return res.status(400).json({ 
          message: 'Impossibile eliminare il cliente: esistono ordini o altri dati associati' 
        });
      }
      
      res.status(500).json({ message: 'Errore nell\'eliminazione del cliente' });
    }
  }

  /**
   * Ottiene statistiche sui clienti
   */
  static async getClientStats(req: Request, res: Response) {
    try {
      // Conteggio totale
      const [totalResult] = await db
        .select({ count: count() })
        .from(clients);
      
      // Conteggio attivi
      const [activeResult] = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.active, true));
      
      // Conteggio inattivi
      const [inactiveResult] = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.active, false));
      
      // Conteggio per tipo di cliente
      const typeCounts = await db
        .select({
          type: clients.clientType,
          count: count()
        })
        .from(clients)
        .groupBy(clients.clientType);
      
      // Statistiche cliente
      const stats = {
        total: totalResult.count,
        active: activeResult.count,
        inactive: inactiveResult.count,
        typeBreakdown: typeCounts.reduce((acc, curr) => {
          acc[curr.type as string] = curr.count;
          return acc;
        }, {} as Record<string, number>)
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Errore nel recupero delle statistiche clienti:', error);
      res.status(500).json({ message: 'Errore nel recupero delle statistiche clienti' });
    }
  }
}