import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Baskets from "@/pages/Baskets";
import BasketDetail from "@/pages/BasketDetail";
import Operations from "@/pages/Operations";
import OperationDetail from "@/pages/OperationDetail";
import EditOperation from "@/pages/EditOperation";
import QuickOperations from "@/pages/QuickOperations";
import OperationsDragDrop from "@/pages/OperationsDragDrop";
import Cycles from "@/pages/Cycles";
import CyclesPaginated from "@/pages/CyclesPaginated";
import CycleDetail from "@/pages/CycleDetail";
import Lots from "@/pages/Lots";
import Statistics from "@/pages/Statistics";
import Sizes from "@/pages/Sizes";
import Sgr from "@/pages/Sgr";
import Settings from "@/pages/Settings";
import Flupsys from "@/pages/Flupsys";
import FlupsyDetails from "@/pages/FlupsyDetails";
import FlupsyFullView from "@/pages/FlupsyFullView";
import FlupsyPositions from "@/pages/FlupsyPositions";
import FlupsyBaskets from "@/pages/FlupsyBaskets";
import FlupsyComparison from "@/pages/FlupsyComparison";
import FlupsyComparisonEnhanced from "@/pages/FlupsyComparisonEnhanced";
import FlupsyDragDrop from "@/pages/FlupsyDragDrop";
import Inventory from "@/pages/Inventory";
import TestView from "@/pages/TestView";
import NFCScan from "@/pages/NFCScan";
import NFCTagManager from "@/pages/NFCTagManager";
import NFCPrimaAttivazione from "@/pages/NFCPrimaAttivazione";
import GrowJourney from "@/pages/GrowJourney";
import BasketSelection from "@/pages/BasketSelection";
import ExportPage from "@/pages/ExportPage";
import DiarioDiBordo from "@/pages/DiarioDiBordo";
import NotificationSettings from "@/pages/NotificationSettings";
import EcoImpact from "@/pages/EcoImpact";
import SalesReports from "@/pages/SalesReports";
import AuthPage from "@/pages/AuthPage";
// Modulo screening rimosso - ora si usa solo Vagliatura con Mappa
// Modulo selezione rimosso - ora si usa solo Vagliatura con Mappa
// Importazione per il nuovo modulo di Vagliatura con Mappa
import VagliaturaConMappa from "@/pages/VagliaturaConMappa";
// Importazioni per la gestione delle pagine di amministrazione
import BackupPage from "@/pages/BackupPage";
import AmministrazioneUtilita from "@/pages/AmministrazioneUtilita";
import { initializeWebSocket } from "./lib/websocket";
import { useEffect } from "react";
import { WebSocketIndicator } from "@/components/WebSocketIndicator";
// Importiamo il sistema di tooltip contestuali
import { TooltipProvider } from "@/contexts/TooltipContext";
import { ContextualTooltip } from "@/components/ui/contextual-tooltip";
// Importiamo il sistema di autenticazione
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Pagina di autenticazione */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Pagine protette */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/flupsys" component={Flupsys}/>
      <ProtectedRoute path="/flupsys/:id" component={FlupsyDetails}/>
      <ProtectedRoute path="/flupsys/:id/positions" component={FlupsyPositions}/>
      <ProtectedRoute path="/flupsys/:id/baskets" component={FlupsyBaskets}/>
      <ProtectedRoute path="/flupsy-positions" component={FlupsyDragDrop}/>
      <ProtectedRoute path="/flupsy-view" component={FlupsyFullView}/>

      <ProtectedRoute path="/flupsy-comparison" component={FlupsyComparison}/>
      <ProtectedRoute path="/flupsy-comparison-enhanced" component={FlupsyComparisonEnhanced}/>
      <ProtectedRoute path="/baskets" component={Baskets}/>
      <ProtectedRoute path="/baskets/:id" component={BasketDetail}/>
      <ProtectedRoute path="/operations" component={Operations}/>
      <ProtectedRoute path="/operations/new" component={Operations}/>
      <ProtectedRoute path="/operations/edit/:id" component={EditOperation}/>
      <ProtectedRoute path="/operations/:id" component={OperationDetail}/>
      <ProtectedRoute path="/quick-operations" component={QuickOperations}/>
      <ProtectedRoute path="/quickoperations" component={QuickOperations}/>
      <ProtectedRoute path="/operations-drag-drop" component={OperationsDragDrop}/>
      <ProtectedRoute path="/cycles" component={CyclesPaginated}/>
      <ProtectedRoute path="/cycles/:id" component={CycleDetail}/>
      <ProtectedRoute path="/lots" component={Lots}/>
      <ProtectedRoute path="/statistics" component={Statistics}/>
      <ProtectedRoute path="/inventory" component={Inventory}/>
      <ProtectedRoute path="/export" component={ExportPage}/>
      <ProtectedRoute path="/sizes" component={Sizes}/>
      <ProtectedRoute path="/sgr" component={Sgr}/>
      <ProtectedRoute path="/settings" component={Settings} requiredRole="admin" />
      <ProtectedRoute path="/test" component={TestView}/>
      <ProtectedRoute path="/nfc-scan" component={NFCScan}/>
      <ProtectedRoute path="/nfc-scan/basket/:id" component={NFCScan}/>
      <ProtectedRoute path="/nfc-prima-attivazione" component={NFCPrimaAttivazione}/>
      <ProtectedRoute path="/nfc-tags" component={NFCTagManager}/>
      <ProtectedRoute path="/grow-journey" component={GrowJourney}/>
      <ProtectedRoute path="/basket-selection" component={BasketSelection}/>
      <ProtectedRoute path="/backup" component={BackupPage} requiredRole="admin" />
      <ProtectedRoute path="/diario-di-impianto" component={DiarioDiBordo}/>
      <ProtectedRoute path="/diario-di-bordo" component={DiarioDiBordo}/>
      <ProtectedRoute path="/notification-settings" component={NotificationSettings} requiredRole="admin" />
      <ProtectedRoute path="/amministrazione-utilita" component={AmministrazioneUtilita} requiredRole="admin" />
      <ProtectedRoute path="/eco-impact" component={EcoImpact}/>
      <ProtectedRoute path="/sales-reports" component={SalesReports}/>
      
      {/* Redirezione per pagine rimosse */}
      <Route path="/tp3000-forecast">
        {() => <Redirect to="/" />}
      </Route>
      <Route path="/nfc-manager">
        {() => <Redirect to="/nfc-tags" />}
      </Route>
      <Route path="/orders">
        {() => <Redirect to="/" />}
      </Route>
      
      {/* Modulo screening rimosso - ora si usa solo Vagliatura con Mappa */}
      
      {/* Modulo selezione rimosso - ora si usa solo Vagliatura con Mappa */}
      
      {/* Vagliatura con Mappa routes */}
      <ProtectedRoute path="/vagliatura-con-mappa" component={VagliaturaConMappa}/>
      
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

// Importiamo il componente di integrazione WebSocket-Query
import { WebSocketQueryIntegration } from './lib/websocketQueryIntegration';
import { OperationListener } from '@/components/OperationListener';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Provider per l'autenticazione */}
      <AuthProvider>
        {/* Inizializza il WebSocket all'avvio dell'app */}
        <WebSocketListener />
        
        {/* Integrazione tra WebSocket e React Query */}
        <WebSocketQueryIntegration />
        
        {/* Listener specifico per invalidazione cache operazioni/cestelli */}
        <OperationListener />
        
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
