import React from 'react';

interface PageHeaderProps {
  title: string;
  className?: string;
  showLogo?: boolean;
  children?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  className = "text-2xl font-condensed font-bold text-gray-800", 
  showLogo = true,
  children 
}: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <h1 className={className}>
        {title}
      </h1>
      {showLogo && (
        <img 
          src="/mito_logo.png" 
          alt="MITO SRL Logo" 
          className="h-11 w-auto"
        />
      )}
      {children}
    </div>
  );
}