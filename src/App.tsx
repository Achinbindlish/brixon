import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Admin from "./pages/Admin.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import LegalPage from "./pages/LegalPage.tsx";
import Offline from "./pages/Offline.tsx";
import ErrorPage from "./pages/ErrorPage.tsx";
import Preloader from "@/components/Preloader";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => {
  const [ready, setReady] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {!ready && <Preloader onComplete={() => setReady(true)} />}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="/offline" element={<Offline />} />
              <Route path="/error" element={<ErrorPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
