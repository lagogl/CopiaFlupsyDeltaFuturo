import React from "react";
import EcoVisualizer from "@/components/eco-impact/EcoVisualizer";
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet";

export default function EcoImpactPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Eco-Impact Score | FLUPSY Manager</title>
      </Helmet>
      <div className="container py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Impatto Ambientale</h1>
          <p className="text-muted-foreground">
            Visualizza e monitora l'impatto ambientale delle operazioni nei FLUPSY.
          </p>
        </div>
        
        <EcoVisualizer />
      </div>
    </MainLayout>
  );
}