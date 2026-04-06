import { useEffect, useState, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserPlus, MoreHorizontal, Shield, KeyRound, UserX, Trash2,
  Loader2, AlertCircle, ChevronUp, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface ManagementUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  status: "active" | "inactive";
}

interface SlackEmployee {
  id: string;
  name: string;
  avatar: string;
  slackEmail: string;
  role: string;
  showsAssigned: number;
  lastLogin: string;
  status: "active" | "inactive";
}

const MANAGEMENT_ROLES = ["admin", "accountant", "team_lead", "floor_manager"];
const EMPLOYEE_ROLES = ["researcher", "editor", "qa", "uploader", "floor_manager"];
const VALID_DOMAINS = ["@dailyvertex.io", "@socialplug.media"];

const roleBadgeColor = (role: string) => {
  switch (role) {
    case "admin": return "bg-primary/15 text-primary border-primary/30";
    case "accountant": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "team_lead": return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "floor_manager": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "researcher": return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "editor": return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
    case "qa": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "uploader": return "bg-pink-500/15 text-pink-400 border-pink-500/30";
    case "pending": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const formatRole = (role: string) => role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

/* ══════ Component ══════ */
const AdminUsers = () => {
  const role = getRole();
  const isAdmin = role === "admin";

  const [mgmtUsers, setMgmtUsers] = useState<ManagementUser[]>([]);
  const [slackUsers, setSlackUsers] = useState<SlackEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  /* Modals */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_lead");
  const [inviting, setInviting] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<ManagementUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editRoleTarget, setEditRoleTarget] = useState<{ id: string; name: string; currentRole: string; type: "mgmt" | "slack" } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  /* Sort for slack table */
  const [slackSort, setSlackSort] = useState<"pending" | "name">("pending");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mgmt, slack] = await Promise.all([
        apiFetch<ManagementUser[]>("/api/admin/users?type=management"),
        apiFetch<SlackEmployee[]>("/api/admin/users?type=slack"),
      ]);
      setMgmtUsers(mgmt);
      setSlackUsers(slack);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Invite ── */
  const validateEmail = (email: string) => {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
    if (!VALID_DOMAINS.some(d => email.toLowerCase().endsWith(d)))
      return `Only ${VALID_DOMAINS.join(" or ")} domains allowed`;
    return "";
  };

  const handleInvite = async () => {
    const err = validateEmail(inviteEmail);
    if (err) { setEmailError(err); return; }
    setInviting(true);
    try {
      await apiFetch("/api/admin/users/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      toast.success("Invite sent — user will receive a set-password email");
      setInviteOpen(false);
      setInviteEmail("");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  /* ── Role change ── */
  const handleRoleChange = async () => {
    if (!editRoleTarget || !newRole) return;
    setSavingRole(true);
    try {
      await apiFetch(`/api/admin/users/${editRoleTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      toast.success(`Role updated to ${formatRole(newRole)}${editRoleTarget.type === "slack" ? " — Slack DM sent" : ""}`);
      setEditRoleTarget(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    } finally {
      setSavingRole(false);
    }
  };

  /* ── Reset password ── */
  const handleResetPassword = async (user: ManagementUser) => {
    try {
      await apiFetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
      toast.success(`Password reset email sent to ${user.email}`);
    } catch {
      toast.error("Failed to send password reset");
    }
  };

  /* ── Deactivate ── */
  const handleDeactivate = async (id: string, type: "mgmt" | "slack") => {
    try {
      await apiFetch(`/api/admin/users/${id}/deactivate`, { method: "POST" });
      toast.success("User deactivated — all tokens revoked");
      fetchData();
    } catch {
      toast.error("Failed to deactivate user");
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("User deleted permanently");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Sorted slack users (pending first) ── */
  const sortedSlack = useMemo(() => {
    const copy = [...slackUsers];
    copy.sort((a, b) => {
      if (slackSort === "pending") {
        const ap = a.role === "pending" ? 0 : 1;
        const bp = b.role === "pending" ? 0 : 1;
        if (ap !== bp) return ap - bp;
      }
      return a.name.localeCompare(b.name);
    });
    return copy;
  }, [slackUsers, slackSort]);

  const pendingCount = slackUsers.filter(u => u.role === "pending").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage management accounts and Slack employee access</p>
      </div>

      {/* ═══ Section 1 — Management Accounts ═══ */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-base">Management Accounts</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />Invite User
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left font-medium px-4 py-3">Name</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Role</th>
                  <th className="text-left font-medium px-4 py-3">Last Login</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mgmtUsers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-8">No management accounts yet</td></tr>
                ) : mgmtUsers.map(user => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-xs", roleBadgeColor(user.role))}>
                        {formatRole(user.role)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.lastLogin || "Never"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={user.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
                        {user.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditRoleTarget({ id: user.id, name: user.name, currentRole: user.role, type: "mgmt" }); setNewRole(user.role); }}>
                            <Shield className="h-4 w-4 mr-2" />Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <KeyRound className="h-4 w-4 mr-2" />Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeactivate(user.id, "mgmt")} className="text-amber-400">
                            <UserX className="h-4 w-4 mr-2" />Deactivate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(user)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Section 2 — Slack Employees ═══ */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="font-display text-base">Slack Employees</CardTitle>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30" variant="outline">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setSlackSort(s => s === "pending" ? "name" : "pending")}
          >
            {slackSort === "pending" ? "Sort by name" : "Pending first"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left font-medium px-4 py-3">Employee</th>
                  <th className="text-left font-medium px-4 py-3">Slack Email</th>
                  <th className="text-left font-medium px-4 py-3">Role</th>
                  <th className="text-right font-medium px-4 py-3">Shows</th>
                  <th className="text-left font-medium px-4 py-3">Last Login</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSlack.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No Slack employees yet</td></tr>
                ) : sortedSlack.map(user => (
                  <tr
                    key={user.id}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/50 transition-colors",
                      user.role === "pending" && "bg-amber-500/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-xs">{user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.slackEmail}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-xs", roleBadgeColor(user.role))}>
                        {user.role === "pending" ? "Pending" : formatRole(user.role)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{user.showsAssigned}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.lastLogin || "Never"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={user.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
                        {user.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditRoleTarget({ id: user.id, name: user.name, currentRole: user.role, type: "slack" }); setNewRole(user.role === "pending" ? "" : user.role); }}>
                            <Shield className="h-4 w-4 mr-2" />{user.role === "pending" ? "Assign Role" : "Change Role"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeactivate(user.id, "slack")} className="text-amber-400">
                            <UserX className="h-4 w-4 mr-2" />Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Invite Modal ═══ */}
      <Dialog open={inviteOpen} onOpenChange={v => { if (!v) { setInviteOpen(false); setInviteEmail(""); setEmailError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Invite Management User</DialogTitle>
            <DialogDescription>Send an invite with a set-password link via email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                placeholder="name@dailyvertex.io"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setEmailError(""); }}
              />
              {emailError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{emailError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Only @dailyvertex.io or @socialplug.media domains</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANAGEMENT_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{formatRole(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Role Dialog ═══ */}
      <Dialog open={!!editRoleTarget} onOpenChange={v => { if (!v) setEditRoleTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editRoleTarget?.type === "slack" && editRoleTarget.currentRole === "pending" ? "Assign Role" : "Change Role"}
            </DialogTitle>
            <DialogDescription>{editRoleTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {(editRoleTarget?.type === "mgmt" ? MANAGEMENT_ROLES : EMPLOYEE_ROLES).map(r => (
                  <SelectItem key={r} value={r}>{formatRole(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editRoleTarget?.type === "slack" && (
              <p className="text-xs text-muted-foreground mt-2">A Slack DM will be sent to notify the employee of their new role.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleTarget(null)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={!newRole || savingRole}>
              {savingRole && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirm ═══ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the account for {deleteTarget?.email}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
