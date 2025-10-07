import { Router } from 'express';
import { storage } from '../../../storage';
import { insertTargetSizeAnnotationSchema } from '../../../../shared/schema';
import { fromZodError } from 'zod-validation-error';

const router = Router();

// === Target Size Annotations Routes ===
// Routes migrated from server/routes.ts (lines 6374-6559)

router.get("", async (req, res) => {
    try {
      // Controlla se ci sono filtri
      const basketId = req.query.basketId ? parseInt(req.query.basketId as string) : null;
      const targetSizeId = req.query.targetSizeId ? parseInt(req.query.targetSizeId as string) : null;
      const status = req.query.status as string || null;
      const withinDays = req.query.withinDays ? parseInt(req.query.withinDays as string) : null;
      
      let annotations;
      
      // Applica i filtri appropriati
      if (basketId) {
        console.log(`Recupero annotazioni per la cesta ID: ${basketId}`);
        annotations = await storage.getTargetSizeAnnotationsByBasket(basketId);
      } else if (targetSizeId && withinDays) {
        console.log(`Recupero annotazioni per la taglia ID: ${targetSizeId} entro ${withinDays} giorni`);
        annotations = await storage.getBasketsPredictedToReachSize(targetSizeId, withinDays);
      } else if (targetSizeId) {
        console.log(`Recupero annotazioni per la taglia ID: ${targetSizeId}`);
        annotations = await storage.getTargetSizeAnnotationsByTargetSize(targetSizeId);
      } else if (status === 'pending') {
        console.log(`Recupero annotazioni con stato: ${status}`);
        annotations = await storage.getPendingTargetSizeAnnotations();
      } else {
        console.log('Recupero tutte le annotazioni');
        annotations = await storage.getTargetSizeAnnotations();
      }
      
      // Arricchisci le annotazioni con dati correlati
      const enrichedAnnotations = await Promise.all(
        annotations.map(async (anno) => {
          const basket = await storage.getBasket(anno.basketId);
          const size = await storage.getSize(anno.targetSizeId);
          
          return {
            ...anno,
            basket,
            targetSize: size
          };
        })
      );
      
      res.json(enrichedAnnotations);
    } catch (error) {
      console.error("Errore nel recupero delle annotazioni di taglia:", error);
      res.status(500).json({ message: "Errore nel recupero delle annotazioni di taglia" });
    }
  });
  
router.get("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID annotazione non valido" });
      }
      
      const annotation = await storage.getTargetSizeAnnotation(id);
      if (!annotation) {
        return res.status(404).json({ message: "Annotazione non trovata" });
      }
      
      // Arricchisci con dati correlati
      const basket = await storage.getBasket(annotation.basketId);
      const size = await storage.getSize(annotation.targetSizeId);
      
      res.json({
        ...annotation,
        basket,
        targetSize: size
      });
    } catch (error) {
      console.error("Errore nel recupero dell'annotazione di taglia:", error);
      res.status(500).json({ message: "Errore nel recupero dell'annotazione di taglia" });
    }
  });
  
router.post("", async (req, res) => {
    try {
      const parsedData = insertTargetSizeAnnotationSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      // Verifica che il cestello esista
      const basket = await storage.getBasket(parsedData.data.basketId);
      if (!basket) {
        return res.status(404).json({ message: "Cestello non trovato" });
      }
      
      // Verifica che la taglia target esista
      const targetSize = await storage.getSize(parsedData.data.targetSizeId);
      if (!targetSize) {
        return res.status(404).json({ message: "Taglia target non trovata" });
      }
      
      // Crea l'annotazione
      const newAnnotation = await storage.createTargetSizeAnnotation(parsedData.data);
      
      // Restituisci il risultato con i dati aggiuntivi
      res.status(201).json({
        ...newAnnotation,
        basket,
        targetSize
      });
    } catch (error) {
      console.error("Errore nella creazione dell'annotazione di taglia:", error);
      res.status(500).json({ message: "Errore nella creazione dell'annotazione di taglia" });
    }
  });
  
router.patch("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID annotazione non valido" });
      }
      
      // Controlla se l'annotazione esiste
      const currentAnnotation = await storage.getTargetSizeAnnotation(id);
      if (!currentAnnotation) {
        return res.status(404).json({ message: "Annotazione non trovata" });
      }
      
      // Valida i dati di aggiornamento
      const updateSchema = z.object({
        status: z.enum(['pending', 'reached', 'canceled']).optional(),
        notes: z.string().nullable().optional(),
        predictedDate: z.string().optional(), // Formato ISO YYYY-MM-DD
        reachedDate: z.string().nullable().optional(), // Formato ISO YYYY-MM-DD
      });
      
      const parsedData = updateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      // Imposta automaticamente reachedDate quando lo stato viene impostato a "reached"
      if (parsedData.data.status === 'reached' && !parsedData.data.reachedDate) {
        parsedData.data.reachedDate = new Date().toISOString().split('T')[0];
      }
      
      // Aggiorna l'annotazione
      const updatedAnnotation = await storage.updateTargetSizeAnnotation(id, parsedData.data);
      
      // Arricchisci con dati correlati
      const basket = await storage.getBasket(updatedAnnotation!.basketId);
      const size = await storage.getSize(updatedAnnotation!.targetSizeId);
      
      res.json({
        ...updatedAnnotation,
        basket,
        targetSize: size
      });
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'annotazione di taglia:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento dell'annotazione di taglia" });
    }
  });
  
router.delete("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID annotazione non valido" });
      }
      
      // Controlla se l'annotazione esiste
      const annotation = await storage.getTargetSizeAnnotation(id);
      if (!annotation) {
        return res.status(404).json({ message: "Annotazione non trovata" });
      }
      
      // Elimina l'annotazione
      const result = await storage.deleteTargetSizeAnnotation(id);
      
      res.json({
        success: result,
        message: result ? "Annotazione eliminata con successo" : "Errore nell'eliminazione dell'annotazione"
      });
    } catch (error) {
      console.error("Errore nell'eliminazione dell'annotazione di taglia:", error);
      res.status(500).json({ message: "Errore nell'eliminazione dell'annotazione di taglia" });
    }
  });
export default router;
