import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AuthPage from "./pages/AuthPage";
import SetupPage from "./pages/SetupPage";
import QuickAddPage from "./pages/QuickAddPage";
import TransactionsPage from "./pages/TransactionsPage";
import InsightsPage from "./pages/InsightsPage";
import ImportPage from "./pages/ImportPage";
import FinanceSettingsPage from "./pages/FinanceSettingsPage";
import MerchantRulesPage from "./pages/MerchantRulesPage";
import FinanceCalendarPage from "./pages/FinanceCalendarPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/add" element={<QuickAddPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/settings" element={<FinanceSettingsPage />} />
          <Route path="/merchant-rules" element={<MerchantRulesPage />} />
          <Route path="/calendar" element={<FinanceCalendarPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
