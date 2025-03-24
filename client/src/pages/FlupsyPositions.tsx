import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
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
    <>
      <Helmet>
        <title>Gestione Posizioni FLUPSY</title>
      </Helmet>

      <div className="space-y-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Suggerimento:</strong> Trascina una cesta attiva e rilasciala su una posizione vuota per spostarla, 
                oppure su una posizione occupata per effettuare uno scambio (switch). 
                Conferma l'operazione nel dialog che apparirà. Alla richiesta "Vuoi fare switch?" conferma per scambiare le posizioni delle due ceste.
              </p>
            </div>
          </div>
        </div>

        <DraggableFlupsyVisualizer />
      </div>
    </>
  );
}