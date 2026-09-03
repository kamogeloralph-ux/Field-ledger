/* Field Ledger direction: calm industrial editorial UI, asymmetric operational layout, evidence before decoration. */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
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
  const { loading, profile, signOut } = useFleetAuth();
  const [, navigate] = useLocation();
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
  useEffect(() => {
    if (!profile || profile.role === "driver" || switchingWorkspace) return;
    setSwitchingWorkspace(true);
    void signOut().finally(() => setSwitchingWorkspace(false));
  }, [profile, signOut, switchingWorkspace]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#ede9dd] text-[#2e4335]"><Loader2 className="h-7 w-7 animate-spin text-[#e9682a]" /></div>;
  }

  if (!profile) return <Login mode="driver" onSuccess={() => navigate("/")} />;
  if (switchingWorkspace || profile.role !== "driver") return <div className="grid min-h-screen place-items-center bg-[#ede9dd] text-[#2e4335]">Returning to driver sign in…</div>;
  return <Router />;
}

export default function App() {
  // Vite's BASE_URL reflects the VITE_BASE_PATH set at build time (e.g. "/Field-ledger/").
  // wouter expects a base without a trailing slash.
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <FleetAuthProvider>
          <TooltipProvider>
            <Toaster position="top-right" />
            <WouterRouter base={base}>
              <AuthGate />
            </WouterRouter>
          </TooltipProvider>
        </FleetAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
