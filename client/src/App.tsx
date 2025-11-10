import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import SchoolDashboard from "@/pages/SchoolDashboard";
import TeacherOnboarding from "@/pages/onboarding/TeacherOnboarding";
import SchoolOnboarding from "@/pages/onboarding/SchoolOnboarding";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Onboarding routes */}
      <Route path="/onboarding/teacher" component={TeacherOnboarding} />
      <Route path="/onboarding/school" component={SchoolOnboarding} />
      
      {/* Role-specific dashboard routes */}
      <Route path="/teacher/dashboard">
        <RoleProtectedRoute allowedRole="teacher">
          <TeacherDashboard />
        </RoleProtectedRoute>
      </Route>
      <Route path="/school/dashboard">
        <RoleProtectedRoute allowedRole="school">
          <SchoolDashboard />
        </RoleProtectedRoute>
      </Route>
      
      {/* Generic dashboard route - redirects to role-specific dashboard */}
      <Route path="/dashboard" component={Dashboard} />
      
      {/* Other protected routes */}
      <Route path="/jobs" component={Jobs} />
      <Route path="/jobs/:id" component={JobDetail} />
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
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
