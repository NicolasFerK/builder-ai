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
  console.log("App component mounting...");
  
  return (
    <div className="w-full h-full">
      {/* TEST VISIBILITY BANNER - Should be visible if anything is rendering */}
      <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-1 z-[9999] font-bold">
        APP IS RUNNING
      </div>

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
