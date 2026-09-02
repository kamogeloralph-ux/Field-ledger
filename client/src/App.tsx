/* Field Ledger direction: calm industrial editorial UI, asymmetric operational layout, evidence before decoration. */
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FleetAuthProvider, useFleetAuth } from "./contexts/FleetAuthContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { loading, profile } = useFleetAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#ede9dd] text-[#2e4335]"><Loader2 className="h-7 w-7 animate-spin text-[#e9682a]" /></div>;
  }

  if (!profile) return <Login onSuccess={() => navigate("/")} />;
  return <Router />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <FleetAuthProvider>
          <TooltipProvider>
            <Toaster position="top-right" />
            <AuthGate />
          </TooltipProvider>
        </FleetAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
