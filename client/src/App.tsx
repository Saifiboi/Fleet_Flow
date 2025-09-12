import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import Vehicles from "@/pages/vehicles";
import Owners from "@/pages/owners";
import Projects from "@/pages/projects";
import Assignments from "@/pages/assignments";
import Payments from "@/pages/payments";
import Maintenance from "@/pages/maintenance";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/vehicles" component={Vehicles} />
        <Route path="/owners" component={Owners} />
        <Route path="/projects" component={Projects} />
        <Route path="/assignments" component={Assignments} />
        <Route path="/payments" component={Payments} />
        <Route path="/maintenance" component={Maintenance} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
