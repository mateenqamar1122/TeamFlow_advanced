import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import Timeline from "./pages/Timeline";
import TimeTracking from "./pages/TimeTracking";
import OKRTracking from "./pages/OKRTracking";
import PortfolioDashboard from "./pages/PortfolioDashboard";
import CustomFieldsManagement from "./pages/CustomFieldsManagement";
import TeamManagement from "./pages/TeamManagement";
import WorkloadHeatmap from "./pages/WorkloadHeatmap";
import WorkloadForecasting from "./pages/WorkloadForecasting";
import TaskTimeEstimator from "./pages/TaskTimeEstimator";
import Reminders from "./pages/Reminders";
import DelayRiskDetection from "./pages/DelayRiskDetection";
import Profile from "./pages/Profile";
import WorkspaceSettings from "./pages/WorkspaceSettings";
// import Settings from "./pages/Settings";
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import Contact from "./pages/Contact";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Mentions from "./pages/Mentions";
import Search from "./pages/Search";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { OnboardingFlow } from "./components/OnboardingFlow";
import InviteAccept from "./pages/InviteAccept";
import AIInsights from "./pages/AIInsights";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkspaceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />

            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />

            {/* Onboarding & Invitations */}
            <Route path="/onboarding" element={<ProtectedRoute><OnboardingFlow /></ProtectedRoute>} />
            <Route path="/invite/accept" element={<InviteAccept />} />
            <Route path="/accept-invitation/:invitationId" element={<InviteAccept />} />

            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><AppLayout><Projects /></AppLayout></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><AppLayout><Calendar /></AppLayout></ProtectedRoute>} />
            <Route path="/timeline" element={<ProtectedRoute><AppLayout><Timeline /></AppLayout></ProtectedRoute>} />
            <Route path="/okr-tracking" element={<ProtectedRoute><AppLayout><OKRTracking /></AppLayout></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><AppLayout><PortfolioDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/custom-fields" element={<ProtectedRoute><AppLayout><CustomFieldsManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/team-management" element={<ProtectedRoute><AppLayout><TeamManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/workload-heatmap" element={<ProtectedRoute><AppLayout><WorkloadHeatmap /></AppLayout></ProtectedRoute>} />
            <Route path="/workload-forecasting" element={<ProtectedRoute><AppLayout><WorkloadForecasting /></AppLayout></ProtectedRoute>} />
            <Route path="/task-time-estimator" element={<ProtectedRoute><AppLayout><TaskTimeEstimator /></AppLayout></ProtectedRoute>} />
            <Route path="/time-tracking" element={<ProtectedRoute><AppLayout><TimeTracking /></AppLayout></ProtectedRoute>} />
            <Route path="/reminders" element={<ProtectedRoute><AppLayout><Reminders /></AppLayout></ProtectedRoute>} />
            <Route path="/delay-risk-detection" element={<ProtectedRoute><AppLayout><DelayRiskDetection /></AppLayout></ProtectedRoute>} />
            <Route path="/ai-insights" element={<ProtectedRoute><AppLayout><AIInsights /></AppLayout></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><AppLayout><Search /></AppLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
            <Route path="/mentions" element={<ProtectedRoute><AppLayout><Mentions /></AppLayout></ProtectedRoute>} />
            <Route path="/workspace/settings" element={<ProtectedRoute><AppLayout><WorkspaceSettings /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
            {/*<Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />*/}

            {/* Catch-all route - must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
