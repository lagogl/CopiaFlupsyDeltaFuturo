import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartphoneIcon, DownloadIcon, XIcon } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Controlla se l'app è già installata
    const checkIfInstalled = () => {
      // PWA è considerata installata se è in modalità standalone
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      // O se è stata avviata dall'home screen
      const isFromHomescreen = (window.navigator as any).standalone === true;
      
      setIsInstalled(isInStandaloneMode || isFromHomescreen);
    };

    checkIfInstalled();

    // Ascolta l'evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Mostra il prompt solo se non è già installata
      if (!isInstalled) {
        setShowInstallPrompt(true);
      }
    };

    // Ascolta l'evento appinstalled
    const handleAppInstalled = () => {
      console.log('PWA installata con successo');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`Utente ha ${outcome === 'accepted' ? 'accettato' : 'rifiutato'} l'installazione`);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Errore durante l\'installazione PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Salva la preferenza dell'utente per non mostrare più il prompt
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Non mostrare se già installata o se l'utente ha già rifiutato
  if (isInstalled || !showInstallPrompt || localStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <Card className="mx-4 mb-4 border-blue-200 bg-blue-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <SmartphoneIcon className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg text-blue-900">Installa App</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-3 text-blue-800">
          Installa FLUPSY sul tuo dispositivo per un accesso rapido e funzionalità NFC ottimizzate. 
          Funziona anche offline!
        </CardDescription>
        <Button 
          onClick={handleInstallClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          Installa Applicazione
        </Button>
      </CardContent>
    </Card>
  );
}