import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ListTodo, XCircle, CheckCircle, AlertTriangle,
  CloudOff, Clock, FileCheck, Wallet, UserPlus, ShieldCheck,
  CheckCheck, Bell,
} from "lucide-react";
import type {
  Notification,
  NotificationType,
  NotificationCategory,
} from "@/hooks/use-notifications";
import { NOTIFICATION_CATEGORY_MAP } from "@/hooks/use-notifications";

/* ── Icon/colour config per type ── */
const typeConfig: Record<NotificationType, { icon: typeof Bell; colorClass: string }> = {
  task_assigned:    { icon: ListTodo,     colorClass: "bg-blue-500/15 text-blue-400" },
  qa_rejected:     { icon: XCircle,      colorClass: "bg-destructive/15 text-destructive" },
  qa_passed:       { icon: CheckCircle,  colorClass: "bg-emerald-500/15 text-emerald-400" },
  fine_issued:     { icon: AlertTriangle, colorClass: "bg-amber-500/15 text-amber-400" },
  pcloud_missing:  { icon: CloudOff,     colorClass: "bg-destructive/15 text-destructive" },
  deadline_warning:{ icon: Clock,        colorClass: "bg-amber-500/15 text-amber-400" },
  episode_verified:{ icon: FileCheck,    colorClass: "bg-emerald-500/15 text-emerald-400" },
  payroll_ready:   { icon: Wallet,       colorClass: "bg-blue-500/15 text-blue-400" },
  new_employee:    { icon: UserPlus,     colorClass: "bg-muted text-muted-foreground" },
  role_assigned:   { icon: ShieldCheck,  colorClass: "bg-teal-500/15 text-teal-400" },
};

const TABS: { label: string; value: "all" | NotificationCategory }[] = [
  { label: "All",    value: "all" },
  { label: "Tasks",  value: "tasks" },
  { label: "QA",     value: "qa" },
  { label: "Fines",  value: "fines" },
  { label: "System", value: "system" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  loading: boolean;
  hasMore: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onLoadMore: () => void;
}

const NotificationsPanel = ({
  open,
  onOpenChange,
  notifications,
  loading,
  hasMore,
  onMarkRead,
  onMarkAllRead,
  onLoadMore,
}: Props) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | NotificationCategory>("all");

  const filtered = tab === "all"
    ? notifications
    : notifications.filter(n => NOTIFICATION_CATEGORY_MAP[n.type] === tab);

  const unreadInView = filtered.filter(n => !n.read).length;

  const handleClick = (n: Notification) => {
    if (!n.read) onMarkRead(n.id);
    if (n.link) {
      onOpenChange(false);
      navigate(n.link);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-lg">Notifications</SheetTitle>
            {unreadInView > 0 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground" onClick={onMarkAllRead}>
                <CheckCheck className="h-3.5 w-3.5" />Mark all read
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {TABS.map(t => {
              const count = t.value === "all"
                ? notifications.filter(n => !n.read).length
                : notifications.filter(n => NOTIFICATION_CATEGORY_MAP[n.type] === t.value && !n.read).length;
              return (
                <Button
                  key={t.value}
                  variant={tab === t.value ? "default" : "ghost"}
                  size="sm"
                  className={cn("text-xs h-7 px-2.5 gap-1", tab !== t.value && "text-muted-foreground")}
                  onClick={() => setTab(t.value)}
                >
                  {t.label}
                  {count > 0 && (
                    <span className={cn(
                      "inline-flex items-center justify-center rounded-full text-[10px] font-semibold min-w-[18px] h-[18px] px-1",
                      tab === t.value ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive/15 text-destructive"
                    )}>
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </SheetHeader>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-5 py-4">
                  <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <>
                {filtered.map(n => {
                  const cfg = typeConfig[n.type] || typeConfig.task_assigned;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        "w-full flex gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50",
                        !n.read && "bg-primary/[0.03]"
                      )}
                    >
                      <div className={cn("flex items-center justify-center h-9 w-9 rounded-lg shrink-0", cfg.colorClass)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm leading-snug", !n.read ? "font-semibold" : "font-medium text-muted-foreground")}>
                            {n.title}
                          </p>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
                {hasMore && (
                  <div className="px-5 py-3">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onLoadMore}>
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsPanel;
