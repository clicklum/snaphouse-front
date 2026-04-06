import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Film, ListTodo, CheckCircle, Users, BarChart3, Bell,
  Search, AlertCircle, RefreshCw, Package,
} from "lucide-react";

/* ── Generic empty state wrapper ── */
interface EmptyStateProps {
  icon?: typeof Film;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState = ({ icon: Icon = Package, title, description, action, className }: EmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center py-16 text-center animate-fade-in", className)}>
    <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
    {action && (
      <Button className="mt-4" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

/* ── Pre-configured empty states ── */
export const ShowsEmpty = ({ onCreateShow }: { onCreateShow?: () => void }) => (
  <EmptyState
    icon={Film}
    title="No shows yet"
    description="Get started by creating your first production show."
    action={onCreateShow ? { label: "Create your first show", onClick: onCreateShow } : undefined}
  />
);

export const TasksEmpty = () => (
  <EmptyState
    icon={ListTodo}
    title="No tasks assigned"
    description="All caught up! New tasks will appear here when assigned."
  />
);

export const MyTasksEmpty = () => (
  <EmptyState
    icon={CheckCircle}
    title="No tasks for you right now"
    description="You're all caught up. Check back later for new assignments."
  />
);

export const EmployeesEmpty = () => (
  <EmptyState
    icon={Users}
    title="No employees found"
    description="Employee records will appear here once team members are added."
  />
);

export const AnalyticsEmpty = () => (
  <EmptyState
    icon={BarChart3}
    title="No Snapchat data yet"
    description="Data syncs daily at 3 AM. Check back tomorrow for performance insights."
  />
);

export const NotificationsEmpty = () => (
  <EmptyState
    icon={CheckCircle}
    title="You're all caught up"
    description="No new notifications. We'll let you know when something needs your attention."
    className="py-12"
  />
);

export const SearchEmpty = ({ query }: { query: string }) => (
  <EmptyState
    icon={Search}
    title={`No results for "${query}"`}
    description="Try searching for a show name, episode, or employee."
    className="py-12"
  />
);

/* ── Error state ── */
interface ErrorStateProps {
  message?: string;
  code?: number | string;
  onRetry?: () => void;
  className?: string;
}

export const PageError = ({ message = "Something went wrong", code, onRetry, className }: ErrorStateProps) => (
  <div className={cn("flex items-center justify-center py-12 animate-fade-in", className)}>
    <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-8 max-w-md w-full text-center space-y-3">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mx-auto">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{message}</h3>
      {code && <p className="text-xs text-muted-foreground">Error code: {code}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />Try again
        </Button>
      )}
    </div>
  </div>
);
