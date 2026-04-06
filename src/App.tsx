import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthGuard from "@/components/AuthGuard";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import SlackLogin from "@/pages/SlackLogin";
import SlackCallback from "@/pages/SlackCallback";
import Dashboard from "@/pages/Dashboard";
import Shows from "@/pages/Shows";
import ShowDetail from "@/pages/ShowDetail";
import Tasks from "@/pages/Tasks";
import MyTasks from "@/pages/MyTasks";
import Analytics from "@/pages/Analytics";
import Employees from "@/pages/Employees";
import EmployeeDetail from "@/pages/EmployeeDetail";
import Attendance from "@/pages/Attendance";
import Payroll from "@/pages/Payroll";
import SettingsPage from "@/pages/SettingsPage";
import EpisodeDetail from "@/pages/EpisodeDetail";
import Leaves from "@/pages/Leaves";
import ShowAnalytics from "@/pages/ShowAnalytics";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/slack" element={<SlackLogin />} />
          <Route path="/auth/slack/callback" element={<SlackCallback />} />
          <Route
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shows" element={<Shows />} />
            <Route path="/shows/:id" element={<ShowDetail />} />
            <Route path="/episodes/:id" element={<EpisodeDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/my" element={<MyTasks />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/analytics/shows" element={<ShowAnalytics />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeDetail />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leaves" element={<Leaves />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
