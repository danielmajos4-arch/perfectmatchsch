import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import RoleSelection from "@/pages/RoleSelection";
import Dashboard from "@/pages/Dashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import SchoolDashboard from "@/pages/SchoolDashboard";
import TeacherOnboarding from "@/pages/onboarding/TeacherOnboarding";
import SchoolOnboarding from "@/pages/onboarding/SchoolOnboarding";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Notifications from "@/pages/Notifications";
import EmailTemplates from "@/pages/EmailTemplates";
import EmailTestingDashboard from "@/pages/EmailTestingDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminJobs from "@/pages/admin/AdminJobs";
import AdminLogin from "@/pages/admin/AdminLogin";
import NotFound from "@/pages/not-found";
import { ServiceWorkerUpdate, OfflineIndicator } from "@/components/ServiceWorkerUpdate";
import { PWAInstallPrompt, IOSInstallInstructions } from "@/components/PWAInstallPrompt";
import { PWATestPanel } from "@/components/PWATestPanel";
import { EmailTestPanel } from "@/components/EmailTestPanel";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { OnboardingRequired } from "@/components/OnboardingRequired";
import { OnboardingWatcher } from "@/components/OnboardingWatcher";
import { EmailTriggerInitializer } from "@/components/EmailTriggerInitializer";
// Import debug utilities to make them available globally
import "@/utils/debugDatabase";
import "@/utils/verifyProfileSave";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/role-selection" component={RoleSelection} />
      <Route path="/register" component={Register} />
      
      {/* Onboarding routes */}
      <Route path="/onboarding/teacher" component={TeacherOnboarding} />
      <Route path="/onboarding/school" component={SchoolOnboarding} />
      
      {/* Role-specific dashboard routes */}
      <Route path="/teacher/dashboard">
        <RoleProtectedRoute allowedRole="teacher">
          <OnboardingRequired>
            <TeacherDashboard />
          </OnboardingRequired>
        </RoleProtectedRoute>
      </Route>
      <Route path="/school/dashboard">
        <RoleProtectedRoute allowedRole="school">
          <SchoolDashboard />
        </RoleProtectedRoute>
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard">
        <AdminProtectedRoute>
          <AdminDashboard />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <AdminProtectedRoute>
          <AdminUsers />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/jobs">
        <AdminProtectedRoute>
          <AdminJobs />
        </AdminProtectedRoute>
      </Route>
      
      {/* Generic dashboard route - redirects to role-specific dashboard */}
      <Route path="/dashboard" component={Dashboard} />
      
      {/* Other protected routes */}
      <Route path="/jobs">
        <OnboardingRequired>
          <Jobs />
        </OnboardingRequired>
      </Route>
      <Route path="/jobs/:id">
        <OnboardingRequired>
          <JobDetail />
        </OnboardingRequired>
      </Route>
      <Route path="/messages">
        <ProtectedRoute>
          <Messages />
        </ProtectedRoute>
      </Route>
            <Route path="/profile">
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            </Route>
            <Route path="/notifications">
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            </Route>
            <Route path="/email-templates">
              <RoleProtectedRoute allowedRole="school">
                <EmailTemplates />
              </RoleProtectedRoute>
            </Route>
            <Route path="/admin/email-testing">
              <ProtectedRoute>
                <EmailTestingDashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/test-email">
              <ProtectedRoute>
                <EmailTestingDashboard />
              </ProtectedRoute>
            </Route>
            
            <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <OnboardingWatcher />
          <ProfileCompletionBanner />
          <EmailTriggerInitializer />
          <Toaster />
          <Router />
          {/* Service Worker Update Prompt */}
          <ServiceWorkerUpdate />
          {/* Offline Indicator */}
          <OfflineIndicator />
          {/* PWA Install Prompt */}
          <PWAInstallPrompt />
          <IOSInstallInstructions />
          {/* PWA Test Panel (Development Only) */}
          <PWATestPanel />
          {/* Email Test Panel (Development Only) */}
          <EmailTestPanel />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
