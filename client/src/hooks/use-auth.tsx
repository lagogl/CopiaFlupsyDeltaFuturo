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
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        throw new Error(data.message || 'Credenziali non valide');
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Errore di accesso',
        description: error.message,
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