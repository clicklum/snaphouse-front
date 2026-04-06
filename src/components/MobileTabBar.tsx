import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Film, ListTodo, Users, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItemsForRole } from "@/lib/permissions";
import { getRole, clearSession } from "@/lib/auth";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const PRIMARY_TABS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Shows", url: "/shows", icon: Film },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "People", url: "/employees", icon: Users },
];

const MobileTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const role = getRole();
  const allItems = getNavItemsForRole(role);

  const primaryUrls = PRIMARY_TABS.map(t => t.url);
  const moreItems = allItems.filter(item => !primaryUrls.includes(item.url));

  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  const handleNav = (url: string) => {
    navigate(url);
    setMoreOpen(false);
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = "/login";
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm safe-bottom md:hidden">
        <div className="flex items-center justify-around h-14 px-1">
          {PRIMARY_TABS.map(tab => {
            const active = isActive(tab.url);
            return (
              <button
                key={tab.url}
                onClick={() => handleNav(tab.url)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.title}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
              moreOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base font-display">More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 py-3">
            {moreItems.map(item => {
              const active = isActive(item.url);
              return (
                <button
                  key={item.url}
                  onClick={() => handleNav(item.url)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.title}</span>
                </button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileTabBar;
