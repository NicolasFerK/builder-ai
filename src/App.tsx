import React, { Component, ErrorInfo, ReactNode } from "react";
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
          <h1 className="text-4xl font-bold text-destructive mb-4">Something went wrong.</h1>
          <p className="text-lg text-muted-foreground mb-6">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            Reload Page
          </button>
          <pre className="mt-8 p-4 bg-muted rounded-md text-left text-xs overflow-auto max-w-full text-muted-foreground">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <div className="w-full h-full">
      <SettingsProvider>
        <ThemeProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <HashRouter>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/project/:projectId" element={<ProjectWorkspace />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </HashRouter>
            </ErrorBoundary>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </ThemeProvider>
      </SettingsProvider>
    </div>
  );
};

export default App;
