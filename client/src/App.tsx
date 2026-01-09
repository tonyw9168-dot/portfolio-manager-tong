import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Holdings from "./pages/Holdings";
import CashFlow from "./pages/CashFlow";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Summary from "./pages/Summary";
import Analysis from "./pages/Analysis";
import Targets from "./pages/Targets";
import ProfitLossDetail from "./pages/ProfitLossDetail";
import PerformanceReport from "./pages/PerformanceReport";
import Forecast from "./pages/Forecast";
import Insurance from "./pages/Insurance";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";


function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuthContext();


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }


  if (!isAuthenticated) {
    return <Login />;
  }


  return <Component />;
}


function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/holdings" component={() => <ProtectedRoute component={Holdings} />} />
      <Route path="/analysis" component={() => <ProtectedRoute component={Analysis} />} />
      <Route path="/history" component={() => <ProtectedRoute component={History} />} />
      <Route path="/summary" component={() => <ProtectedRoute component={Summary} />} />
      <Route path="/profit-loss" component={() => <ProtectedRoute component={ProfitLossDetail} />} />
      <Route path="/performance" component={() => <ProtectedRoute component={PerformanceReport} />} />
      <Route path="/targets" component={() => <ProtectedRoute component={Targets} />} />
      <Route path="/forecast" component={() => <ProtectedRoute component={Forecast} />} />
      <Route path="/cashflow" component={() => <ProtectedRoute component={CashFlow} />} />
      <Route path="/insurance" component={() => <ProtectedRoute component={Insurance} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}


function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}


export default App;
