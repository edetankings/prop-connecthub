import SeoDefaults from "@/components/SeoDefaults";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import MotionReveal from "@/components/MotionReveal";
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
import SafetyCenter from "./pages/trust/SafetyCenter";
import EscrowProtection from "./pages/trust/EscrowProtection";
import AgentVerification from "./pages/trust/AgentVerification";
import PropertyVerification from "./pages/trust/PropertyVerification";
import FraudPrevention from "./pages/trust/FraudPrevention";
import CodeOfConduct from "./pages/trust/CodeOfConduct";
import InvestingInNigeria from "./pages/InvestingInNigeria";
import SecurePayment from "./pages/SecurePayment";
import AgentDeals from "./pages/AgentDeals";

import AdminSecurePayments from "./pages/AdminSecurePayments";
import AdminDisputes from "./pages/AdminDisputes";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import AdminAudit from "./pages/AdminAudit";
import AdminOverview from "./pages/AdminOverview";
import AdminPropertyMonitoring from "./pages/AdminPropertyMonitoring";
import BuyerSecurePayments from "./pages/BuyerSecurePayments";
import AIAssistant from "./pages/AIAssistant";
import DealRoom from "./pages/DealRoom";
import DealsList from "./pages/DealsList";
import Inspections from "./pages/Inspections";

import WelcomeModal from "./components/WelcomeModal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <SeoDefaults />
        <AuthProvider>
          <WelcomeModal />
          <MotionReveal />
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
            <Route path="/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/trust/safety-center" element={<SafetyCenter />} />
            <Route path="/trust/escrow-protection" element={<EscrowProtection />} />
            <Route path="/trust/agent-verification" element={<AgentVerification />} />
            <Route path="/trust/property-verification" element={<PropertyVerification />} />
            <Route path="/trust/fraud-prevention" element={<FraudPrevention />} />
            <Route path="/trust/code-of-conduct" element={<CodeOfConduct />} />
            <Route path="/guides/investing-in-nigeria" element={<InvestingInNigeria />} />
            {/* Role-based dashboard router */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/buyer" element={<ProtectedRoute><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/agent/deals" element={<ProtectedRoute><AgentDeals /></ProtectedRoute>} />

            <Route path="/dashboard/builder" element={<ProtectedRoute><BuilderDashboard /></ProtectedRoute>} />
            <Route path="/add-property" element={<ProtectedRoute><AddProperty /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/verification" element={<ProtectedRoute><IdentityVerification /></ProtectedRoute>} />
            <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/secure-payment/:propertyId" element={<ProtectedRoute><SecurePayment /></ProtectedRoute>} />
            <Route path="/dashboard/buyer/secure-payments" element={<ProtectedRoute><BuyerSecurePayments /></ProtectedRoute>} />
            <Route path="/deal/:id" element={<ProtectedRoute><DealRoom /></ProtectedRoute>} />
            <Route path="/dashboard/buyer/deals" element={<ProtectedRoute><DealsList mode="buyer" /></ProtectedRoute>} />
            <Route path="/dashboard/buyer/inspections" element={<ProtectedRoute><Inspections mode="buyer" /></ProtectedRoute>} />
            <Route path="/dashboard/agent/inspections" element={<ProtectedRoute><Inspections mode="agent" /></ProtectedRoute>} />
            <Route path="/admin/deals" element={<AdminRoute><DealsList mode="admin" /></AdminRoute>} />
            <Route path="/admin/inspections" element={<AdminRoute><Inspections mode="admin" /></AdminRoute>} />
            <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />

            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/overview" element={<AdminRoute><AdminOverview /></AdminRoute>} />
            <Route path="/admin/properties" element={<AdminRoute><AdminPropertyMonitoring /></AdminRoute>} />
            <Route path="/admin/secure-payments" element={<AdminRoute><AdminSecurePayments /></AdminRoute>} />
            <Route path="/admin/disputes" element={<AdminRoute><AdminDisputes /></AdminRoute>} />
            <Route path="/admin/withdrawals" element={<AdminRoute><AdminWithdrawals /></AdminRoute>} />
            <Route path="/admin/audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
