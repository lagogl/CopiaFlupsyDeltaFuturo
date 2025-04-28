import React from 'react';
import { Route, Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
  requiredRole?: 'admin' | 'user' | 'visitor';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  path,
  component: Component,
  requiredRole
}) => {
  const { user, isLoading } = useAuth();

  // Se l'autenticazione è in corso, mostra un loader
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Se l'utente non è autenticato, reindirizza alla pagina di login
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Se è richiesto un ruolo specifico e l'utente non ha quel ruolo, reindirizza
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    // Gli admin hanno accesso a tutte le pagine
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // Se l'utente è autenticato e ha il ruolo richiesto (o non è richiesto un ruolo specifico)
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
};