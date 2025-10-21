interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-lg text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export { PageHeader };