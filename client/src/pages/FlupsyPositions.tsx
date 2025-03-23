import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import MainLayout from "@/layouts/MainLayout";
import DraggableFlupsyVisualizer from "@/components/dashboard/DraggableFlupsyVisualizer";

export default function FlupsyPositions() {
  // Precarica i dati necessari per il visualizzatore
  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: operations } = useQuery({
    queryKey: ['/api/operations'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  return (
    <MainLayout>
      <Helmet>
        <title>Gestione Posizioni FLUPSY</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestione Posizioni FLUPSY</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Suggerimento:</strong> Trascina una cesta attiva e rilasciala su una posizione vuota per spostarla. 
                Conferma l'operazione nel dialog che apparirà. Le posizioni occupate non permettono il rilascio di una cesta.
              </p>
            </div>
          </div>
        </div>

        <DraggableFlupsyVisualizer />
      </div>
    </MainLayout>
  );
}