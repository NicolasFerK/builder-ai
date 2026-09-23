import { HashRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/context/SettingsContext";
import { ThemeProvider } from "@/components/theme-provider";

const App = () => {
  return (
    <div className="w-full h-full">
      <SettingsProvider>
        <ThemeProvider>
          <TooltipProvider>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/project/:projectId" element={<ProjectWorkspace />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </ThemeProvider>
      </SettingsProvider>
    </div>
  );
};

export default App;
