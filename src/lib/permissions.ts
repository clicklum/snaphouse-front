import type { AppRole } from "./auth";
import {
  LayoutDashboard,
  Film,
  ListTodo,
  BarChart3,
  Users,
  CalendarCheck,
  Wallet,
  Settings,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  /** Roles allowed to see this item. undefined = all authenticated (non-pending). */
  roles?: AppRole[];
}

export const allNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Shows", url: "/shows", icon: Film },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["admin", "accountant", "floor_manager", "team_lead", "researcher", "editor", "qa", "uploader"] },
  { title: "Employees", url: "/employees", icon: Users, roles: ["admin", "floor_manager"] },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Payroll", url: "/payroll", icon: Wallet, roles: ["admin", "accountant"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin"] },
];

export function getNavItemsForRole(role: AppRole): NavItem[] {
  if (role === "pending") return [];
  return allNavItems.filter((item) => !item.roles || item.roles.includes(role));
}

/** Route-level access rules */
export interface RouteRule {
  pattern: string;
  roles: AppRole[];
}

export const routeRules: RouteRule[] = [
  { pattern: "/admin", roles: ["admin"] },
  { pattern: "/payroll", roles: ["admin", "accountant"] },
  { pattern: "/analytics", roles: ["admin", "accountant", "floor_manager", "team_lead", "researcher", "editor", "qa", "uploader"] },
  { pattern: "/employees", roles: ["admin", "floor_manager", "team_lead", "researcher", "editor", "qa", "uploader", "accountant"] },
];

export function canAccessRoute(path: string, role: AppRole): boolean {
  if (role === "pending") {
    return path === "/profile";
  }
  for (const rule of routeRules) {
    if (path.startsWith(rule.pattern)) {
      return rule.roles.includes(role);
    }
  }
  return true; // no rule = open to all authenticated non-pending
}
