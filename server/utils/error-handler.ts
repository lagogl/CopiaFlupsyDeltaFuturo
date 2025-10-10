/**
 * Utility per gestione centralizzata degli errori nelle response Express
 */
import type { Response } from "express";

/**
 * Invia una risposta di errore standardizzata
 * @param res - Express Response object
 * @param error - L'errore catturato (unknown type)
 * @param message - Messaggio user-friendly
 * @param statusCode - HTTP status code (default: 500)
 */
export function sendError(
  res: Response, 
  error: unknown, 
  message: string = "Errore interno del server", 
  statusCode: number = 500
): Response {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`${message}:`, error);
  return res.status(statusCode).json({
    success: false,
    message,
    error: errorMessage
  });
}

/**
 * Invia una risposta di successo standardizzata
 * @param res - Express Response object
 * @param data - I dati da inviare
 * @param message - Messaggio di successo opzionale
 */
export function sendSuccess(
  res: Response,
  data: any,
  message?: string
): Response {
  return res.status(200).json({
    success: true,
    message,
    ...data
  });
}