import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Baskets from "@/pages/Baskets";
import Operations from "@/pages/Operations";
import Cycles from "@/pages/Cycles";
import CycleDetail from "@/pages/CycleDetail";
import Lots from "@/pages/Lots";
import Statistics from "@/pages/Statistics";
import Sizes from "@/pages/Sizes";
import Sgr from "@/pages/Sgr";
import Settings from "@/pages/Settings";
import Flupsys from "@/pages/Flupsys";
import FlupsyFullView from "@/pages/FlupsyFullView";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/flupsys" component={Flupsys}/>
      <Route path="/flupsy-view" component={FlupsyFullView}/>
      <Route path="/baskets" component={Baskets}/>
      <Route path="/operations" component={Operations}/>
      <Route path="/cycles" component={Cycles}/>
      <Route path="/cycles/:id" component={CycleDetail}/>
      <Route path="/lots" component={Lots}/>
      <Route path="/statistics" component={Statistics}/>
      <Route path="/sizes" component={Sizes}/>
      <Route path="/sgr" component={Sgr}/>
      <Route path="/settings" component={Settings}/>
      
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
