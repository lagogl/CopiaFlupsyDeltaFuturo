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
import Inventory from "@/pages/Inventory";
import TestView from "@/pages/TestView";
import NFCScan from "@/pages/NFCScan";
import NFCTagManager from "@/pages/NFCTagManager";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/flupsys" component={Flupsys}/>
      <Route path="/flupsy-view" component={FlupsyFullView}/>
      <Route path="/flupsy-positions" component={FlupsyPositions}/>
      <Route path="/flupsy-comparison" component={FlupsyComparison}/>
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
      <Route path="/sizes" component={Sizes}/>
      <Route path="/sgr" component={Sgr}/>
      <Route path="/settings" component={Settings}/>
      <Route path="/test" component={TestView}/>
      <Route path="/nfc-scan" component={NFCScan}/>
      <Route path="/nfc-tags" component={NFCTagManager}/>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <Router />
      </MainLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
