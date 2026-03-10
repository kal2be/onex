import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import ResearchProjects from "./pages/ResearchProjects";
import DataLab from "./pages/DataLab";
import StrategyBuilder from "./pages/StrategyBuilder";
import TradingTerminal from "./pages/TradingTerminal";
import BacktestEngine from "./pages/BacktestEngine";
import RegimeAnalysis from "./pages/RegimeAnalysis";
import RobustnessLab from "./pages/RobustnessLab";
import MonteCarlo from "./pages/MonteCarlo";
import Optimization from "./pages/Optimization";
import ResultsExplorer from "./pages/ResultsExplorer";
import ExportDeploy from "./pages/ExportDeploy";
import Settings from "./pages/Settings";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <LiveDataProvider>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/research" element={<ResearchProjects />} />
                    <Route path="/terminal" element={<TradingTerminal />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/data-lab" element={<DataLab />} />
                    <Route path="/strategy" element={<StrategyBuilder />} />
                    <Route path="/backtest" element={<BacktestEngine />} />
                    <Route path="/regime" element={<RegimeAnalysis />} />
                    <Route path="/robustness" element={<RobustnessLab />} />
                    <Route path="/monte-carlo" element={<MonteCarlo />} />
                    <Route path="/optimization" element={<Optimization />} />
                    <Route path="/results" element={<ResultsExplorer />} />
                    <Route path="/export" element={<ExportDeploy />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </LiveDataProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
