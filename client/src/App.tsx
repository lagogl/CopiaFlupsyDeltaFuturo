import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Baskets from "@/pages/Baskets";
import Operations from "@/pages/Operations";
import OperationDetail from "@/pages/OperationDetail";
import QuickOperations from "@/pages/QuickOperations";
import OperationsDragDrop from "@/pages/OperationsDragDrop";
import Cycles from "@/pages/Cycles";
import CycleDetail from "@/pages/CycleDetail";
import Lots from "@/pages/Lots";
import Statistics from "@/pages/Statistics";
import Sizes from "@/pages/Sizes";
import Sgr from "@/pages/Sgr";
import Settings from "@/pages/Settings";
import Flupsys from "@/pages/Flupsys";
import FlupsyFullView from "@/pages/FlupsyFullView";
import FlupsyPositions from "@/pages/FlupsyPositions";
import FlupsyComparison from "@/pages/FlupsyComparison";
import FlupsyComparisonEnhanced from "@/pages/FlupsyComparisonEnhanced";
import Inventory from "@/pages/Inventory";
import TestView from "@/pages/TestView";
import NFCScan from "@/pages/NFCScan";
import NFCTagManager from "@/pages/NFCTagManager";
import GrowJourney from "@/pages/GrowJourney";
import BasketSelection from "@/pages/BasketSelection";
import ExportPage from "@/pages/ExportPage";
// Importiamo la nuova pagina per la gestione avanzata di NFC
import NfcManagerPage from "@/nfc-features/pages/NfcManagerPage";
// Importiamo le pagine per il modulo di vagliatura
import Screening from "@/pages/Screening";
import NewScreening from "@/pages/NewScreening";
import ScreeningDetail from "@/pages/ScreeningDetail";
import ScreeningAddSource from "@/pages/ScreeningAddSource";
import ScreeningAddDestination from "@/pages/ScreeningAddDestination";
import { initializeWebSocket } from "./lib/websocket";
import { useEffect } from "react";
import { WebSocketIndicator } from "@/components/WebSocketIndicator";
// Importiamo il sistema di tooltip contestuali
import { TooltipProvider } from "@/contexts/TooltipContext";
import { ContextualTooltip } from "@/components/ui/contextual-tooltip";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/flupsys" component={Flupsys}/>
      <Route path="/flupsy-view" component={FlupsyFullView}/>
      <Route path="/flupsy-positions" component={FlupsyPositions}/>
      <Route path="/flupsy-comparison" component={FlupsyComparison}/>
      <Route path="/flupsy-comparison-enhanced" component={FlupsyComparisonEnhanced}/>
      <Route path="/baskets" component={Baskets}/>
      <Route path="/operations" component={Operations}/>
      <Route path="/operations/:id" component={OperationDetail}/>
      <Route path="/quick-operations" component={QuickOperations}/>
      <Route path="/quickoperations" component={QuickOperations}/>
      <Route path="/operations-drag-drop" component={OperationsDragDrop}/>
      <Route path="/cycles" component={Cycles}/>
      <Route path="/cycles/:id" component={CycleDetail}/>
      <Route path="/lots" component={Lots}/>
      <Route path="/statistics" component={Statistics}/>
      <Route path="/inventory" component={Inventory}/>
      <Route path="/export" component={ExportPage}/>
      <Route path="/sizes" component={Sizes}/>
      <Route path="/sgr" component={Sgr}/>
      <Route path="/settings" component={Settings}/>
      <Route path="/test" component={TestView}/>
      <Route path="/nfc-scan" component={NFCScan}/>
      <Route path="/nfc-scan/basket/:id" component={NFCScan}/>
      <Route path="/nfc-tags" component={NFCTagManager}/>
      <Route path="/nfc-manager" component={NfcManagerPage}/>
      <Route path="/grow-journey" component={GrowJourney}/>
      <Route path="/basket-selection" component={BasketSelection}/>
      
      {/* Screening (Vagliatura) routes */}
      <Route path="/screening" component={Screening}/>
      <Route path="/screening/new" component={NewScreening}/>
      <Route path="/screening/:id" component={ScreeningDetail}/>
      <Route path="/screening/:id/add-source" component={ScreeningAddSource}/>
      <Route path="/screening/:id/add-destination" component={ScreeningAddDestination}/>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Componente WebSocketListener che semplicemente inizializza il WebSocket
function WebSocketListener() {
  useEffect(() => {
    // Inizializza il WebSocket quando il componente viene montato
    initializeWebSocket();
    
    // Non è necessario fare pulizia perché vogliamo mantenere la connessione
    // aperta per tutta la durata dell'applicazione
  }, []);
  
  return null; // Questo componente non renderizza nulla
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Inizializza il WebSocket all'avvio dell'app */}
      <WebSocketListener />
      
      {/* Provider per i tooltip contestuali personalizzati */}
      <TooltipProvider>
        <MainLayout>
          <Router />
        </MainLayout>
        
        {/* Componente che renderizza i tooltip attivi */}
        <ContextualTooltip />
        
        {/* Indicatore di stato della connessione WebSocket */}
        <WebSocketIndicator />
        
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
