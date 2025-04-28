import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// Definizione dei tipi
interface User {
  id: number;
  username: string;
  role: 'admin' | 'user' | 'visitor';
  language: 'it' | 'en' | 'pt';
  lastLogin?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  password: string;
  role: 'user' | 'visitor';
  language: 'it' | 'en' | 'pt';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<boolean>;
  updateLanguage: (language: 'it' | 'en' | 'pt') => void;
}

// Creazione del context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Carica l'utente dal localStorage all'avvio
  useEffect(() => {
    const loadUser = () => {
      try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          setUser(userData);
        }
      } catch (err) {
        console.error('Errore nel caricamento dei dati utente:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Funzione di login
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Tentativo di login con:", credentials.username);
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      console.log("Status risposta:", response.status, response.statusText);
      
      // Ottieni il testo della risposta invece di assumere che sia JSON
      const responseText = await response.text();
      console.log("Testo risposta completo:", responseText);
      
      // Prova a parsare il JSON solo se c'è del contenuto
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
        console.log("Risposta login (parsata):", data);
      } catch (jsonError) {
        console.error("Errore nel parsing JSON della risposta:", jsonError);
        console.error("Testo risposta che ha causato errore:", responseText);
        throw new Error('Risposta del server non è in formato JSON valido');
      }
      
      if (response.ok && data.success && data.user) {
        console.log("Login riuscito con utente:", data.user);
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        console.error("Login fallito:", data);
        throw new Error(data.message || 'Credenziali non valide');
      }
    } catch (err) {
      console.error("Eccezione durante il login:", err);
      const error = err as Error;
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Errore di accesso',
        description: error.message || 'Errore sconosciuto durante il login',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione di logout
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Opzionalmente chiama l'API di logout se necessario
      // await fetch('/api/logout', { method: 'POST' });
      
      // Rimuovi l'utente dal localStorage e dallo stato
      localStorage.removeItem('user');
      setUser(null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Errore durante il logout',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione di registrazione
  const register = async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: 'Registrazione completata',
          description: 'Account creato con successo',
        });
        return true;
      } else {
        throw new Error(result.message || 'Errore durante la registrazione');
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Errore di registrazione',
        description: error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per aggiornare la lingua dell'utente
  const updateLanguage = (language: 'it' | 'en' | 'pt') => {
    if (user) {
      const updatedUser = { ...user, language };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    isLoading,
    error,
    login,
    logout,
    register,
    updateLanguage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook personalizzato per usare il context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  }
  
  return context;
}