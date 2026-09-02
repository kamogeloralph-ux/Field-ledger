import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FleetAuthProvider } from "@/contexts/FleetAuthContext";
import Admin from "@/pages/Admin";
import "./index.css";

ReactDOM.createRoot(document.getElementById("admin-root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light">
      <FleetAuthProvider>
        <TooltipProvider>
          <Toaster position="top-right" />
          <Admin />
        </TooltipProvider>
      </FleetAuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
