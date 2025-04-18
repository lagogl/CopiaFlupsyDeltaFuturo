import React, { ReactNode } from "react";

interface PageHeadingProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export const PageHeading: React.FC<PageHeadingProps> = ({
  title,
  description,
  icon,
  className = "",
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center">
        {icon && <div className="mr-3">{icon}</div>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {description && (
        <p className="text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
};