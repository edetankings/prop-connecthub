import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Agents from "./pages/Agents";
import AgentProfile from "./pages/AgentProfile";
import Chat from "./pages/Chat";
import ChatInbox from "./pages/ChatInbox";
import Announcements from "./pages/Announcements";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import BuilderDashboard from "./pages/BuilderDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AddProperty from "./pages/AddProperty";
import Settings from "./pages/Settings";
import IdentityVerification from "./pages/IdentityVerification";
import Earnings from "./pages/Earnings";
import Payments from "./pages/Payments";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import WelcomeModal from "./components/WelcomeModal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WelcomeModal />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agent/:id" element={<AgentProfile />} />
            <Route path="/messages" element={<ProtectedRoute><ChatInbox /></ProtectedRoute>} />
            <Route path="/chat/new" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/chat/:threadId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Role-based dashboard router */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/buyer" element={<ProtectedRoute><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/builder" element={<ProtectedRoute><BuilderDashboard /></ProtectedRoute>} />
            <Route path="/add-property" element={<ProtectedRoute><AddProperty /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/verification" element={<ProtectedRoute><IdentityVerification /></ProtectedRoute>} />
            <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
