import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Componente per l'intestazione di pagina standard
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 pb-4 border-b">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;