interface PageHeaderProps {
  title: string;
  subtitle?: string;
  logoUrl?: string;
}

export default function PageHeader({ title, subtitle, logoUrl = "/mito_logo.png" }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-lg text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      <img 
        src={logoUrl} 
        alt="MITO SRL Logo" 
        className="h-8 w-auto ml-auto"
      />
    </div>
  );
}

export { PageHeader };