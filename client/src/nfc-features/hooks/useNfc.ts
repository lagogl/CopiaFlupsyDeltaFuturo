// Hook per utilizzare le funzionalità NFC nei componenti React
import { useState, useEffect, useCallback } from 'react';
import { nfcService } from '../utils/nfcService';
import type { NfcTag } from '../utils/nfcSimulator';

interface UseNfcOptions {
  autoStart?: boolean;
  onTag?: (tag: NfcTag) => void;
  onError?: (error: Error) => void;
}

export const useNfc = (options: UseNfcOptions = {}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScannedTag, setLastScannedTag] = useState<NfcTag | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Callback per la gestione di un tag scansionato
  const handleTag = useCallback((tag: NfcTag) => {
    setLastScannedTag(tag);
    setError(null);
    if (options.onTag) {
      options.onTag(tag);
    }
  }, [options.onTag]);

  // Callback per la gestione degli errori
  const handleError = useCallback((error: Error) => {
    setError(error);
    if (options.onError) {
      options.onError(error);
    }
  }, [options.onError]);

  // Avvia la scansione NFC
  const startScan = useCallback(async () => {
    try {
      await nfcService.startScan({
        onReading: handleTag,
        onError: handleError
      });
      setIsScanning(true);
    } catch (e) {
      const error = e as Error;
      setError(error);
      handleError(error);
    }
  }, [handleTag, handleError]);

  // Ferma la scansione NFC
  const stopScan = useCallback(async () => {
    try {
      await nfcService.stopScan();
      setIsScanning(false);
    } catch (e) {
      const error = e as Error;
      setError(error);
      handleError(error);
    }
  }, [handleError]);

  // Simula una scansione (utile per test)
  const simulateScan = useCallback(async (tagId?: string) => {
    try {
      const tag = await nfcService.simulateScan(tagId);
      if (tag) {
        setLastScannedTag(tag);
        if (options.onTag) {
          options.onTag(tag);
        }
        return tag;
      }
      return null;
    } catch (e) {
      const error = e as Error;
      setError(error);
      handleError(error);
      return null;
    }
  }, [options.onTag, handleError]);

  // Scrivi dati su un tag NFC
  const writeTag = useCallback(async (data: any, writeOptions = {}) => {
    try {
      const success = await nfcService.writeTag(data, writeOptions);
      return success;
    } catch (e) {
      const error = e as Error;
      setError(error);
      handleError(error);
      return false;
    }
  }, [handleError]);

  // Attiva o disattiva la modalità simulazione
  const toggleSimulationMode = useCallback((enabled: boolean) => {
    nfcService.setSimulationMode(enabled);
    setIsSimulationMode(enabled);
  }, []);

  // Verifiche iniziali e cleanup
  useEffect(() => {
    // Verifica se il NFC è supportato
    setIsSupported(nfcService.isSupported());
    
    // Verifica se la modalità simulazione è attiva
    setIsSimulationMode(nfcService.isSimulationModeEnabled());
    
    // Avvia automaticamente la scansione se richiesto
    if (options.autoStart) {
      startScan();
    }
    
    // Aggiungi un listener globale per le scansioni NFC
    const removeListener = nfcService.addScanListener(handleTag);
    
    // Cleanup
    return () => {
      if (isScanning) {
        nfcService.stopScan();
      }
      removeListener();
    };
  }, [options.autoStart, startScan, handleTag, isScanning]);

  return {
    isScanning,
    isSupported,
    isSimulationMode,
    lastScannedTag,
    error,
    startScan,
    stopScan,
    simulateScan,
    writeTag,
    toggleSimulationMode
  };
};