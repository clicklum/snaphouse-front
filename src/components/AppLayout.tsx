import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import NotificationsPanel from "@/components/NotificationsPanel";
import GlobalSearch, { trackPageVisit } from "@/components/GlobalSearch";

const AppLayout = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllRead,
    loadMore,
    refresh,
  } = useNotifications();

  const handleOpenPanel = () => {
    setPanelOpen(true);
    refresh();
  };

  /* CMD+K / Ctrl+K shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* Track recent page visits */
  useEffect(() => {
    const path = location.pathname;
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) { trackPageVisit("/", "Dashboard"); return; }
    const title = segments[segments.length - 1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
    trackPageVisit(path, title);
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
            <div className="flex items-center gap-3">
              {/* Search trigger */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground h-9 px-3"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>
              {/* Notification Bell */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={handleOpenPanel}
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className={cn(
                    "absolute flex items-center justify-center rounded-full bg-destructive text-destructive-foreground font-semibold",
                    unreadCount > 9
                      ? "top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 text-[10px]"
                      : "top-1 right-1 h-[14px] w-[14px] text-[9px]"
                  )}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
              <ThemeToggle />
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  SJ
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-6 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <NotificationsPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        notifications={notifications}
        loading={loading}
        hasMore={hasMore}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllRead}
        onLoadMore={loadMore}
      />
    </SidebarProvider>
  );
};

export default AppLayout;
