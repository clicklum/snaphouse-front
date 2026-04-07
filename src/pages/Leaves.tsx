import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { getRole, getUserName } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import {
  CalendarDays, Loader2, Plus, Check, X, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

/* ── Types ── */
interface LeaveBalance { type: string; remaining: number; total: number; }
interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  createdAt: string;
}
interface TeamLead { id: string; name: string; }

const LEAVE_TYPES = ["Annual", "Sick", "Emergency", "Unpaid"];

const statusBadge: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
};

const initials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

/* ══════ Request Leave Drawer ══════ */
const RequestLeaveDrawer = ({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) => {
  const [leaveType, setLeaveType] = useState("Annual");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const days = fromDate && toDate ? Math.max(1, differenceInCalendarDays(toDate, fromDate) + 1) : 0;
  const isValid = !!fromDate && !!toDate && toDate >= fromDate && reason.trim().length > 0;

  const reset = () => { setLeaveType("Annual"); setFromDate(undefined); setToDate(undefined); setReason(""); };

  const submit = async () => {
    if (!isValid || !fromDate || !toDate) return;
    setSaving(true);
    try {
      await api.post("/api/leaves", {
          type: leaveType,
          from: format(fromDate, "yyyy-MM-dd"),
          to: format(toDate, "yyyy-MM-dd"),
          reason: reason.trim(),
        });
      toast.success("Leave request submitted");
      reset();
      onOpenChange(false);
      onCreated();
    } catch { toast.error("Failed to submit leave request"); }
    finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display">Request Leave</SheetTitle>
          <SheetDescription>Submit a leave request for approval</SheetDescription>
        </SheetHeader>
        <div className="space-y-5">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* From */}
          <div className="space-y-1.5">
            <Label>From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left h-9 font-normal", !fromDate && "text-muted-foreground")}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "PPP") : "Pick start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <Label>To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left h-9 font-normal", !toDate && "text-muted-foreground")}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "PPP") : "Pick end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={toDate} onSelect={setToDate} disabled={d => fromDate ? d < fromDate : false} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {days > 0 && (
            <p className="text-sm text-muted-foreground">{days} day{days > 1 ? "s" : ""} requested</p>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea placeholder="Why do you need leave?" value={reason} onChange={e => setReason(e.target.value)} rows={3} className="text-sm" />
          </div>

          <Button className="w-full" onClick={submit} disabled={saving || !isValid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Request
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ══════ Main Page ══════ */
const Leaves = () => {
  const role = getRole();
  const userName = getUserName();
  const isManager = ["admin", "floor_manager", "team_lead"].includes(role);
  const isTopManager = ["admin", "floor_manager"].includes(role);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  /* employee data */
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);

  /* team data */
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [leadFilter, setLeadFilter] = useState("all");

  /* actions loading */
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const promises: Promise<void>[] = [
      api.get<{ balances: LeaveBalance[]; leaves: LeaveRequest[] }>("/api/leaves/my")
        .then(d => { setBalances(d.balances); setMyLeaves(d.leaves); }),
    ];
    if (isManager) {
      promises.push(
        api.get<LeaveRequest[]>("/api/leaves/team").then(setTeamLeaves)
      );
      if (isTopManager) {
        promises.push(
          api.get<TeamLead[]>("/api/employees?role=team_lead&fields=id,name")
            .then(setTeamLeads)
            .catch(() => {})
        );
      }
    }
    Promise.all(promises)
      .catch(() => toast.error("Failed to load leave data"))
      .finally(() => setLoading(false));
  }, [isManager, isTopManager]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* approve / reject */
  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setActionId(id);
    try {
      await api.patch(`/api/leaves/${id}`, { status: action });
      toast.success(`Leave ${action}`);
      fetchData();
    } catch { toast.error(`Failed to ${action === "approved" ? "approve" : "reject"} leave`); }
    finally { setActionId(null); }
  };

  /* filtered team leaves */
  const filteredTeam = useMemo(() => {
    if (leadFilter === "all") return teamLeaves;
    return teamLeaves.filter(l => l.employeeId === leadFilter);
  }, [teamLeaves, leadFilter]);

  const pending = filteredTeam.filter(l => l.status === "pending");
  const approved = filteredTeam.filter(l => l.status === "approved");
  const rejected = filteredTeam.filter(l => l.status === "rejected");

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Request and manage leave</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />Request Leave
        </Button>
      </div>

      {/* ═══ MY SECTION ═══ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Leave</h2>

        {/* Balance cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {balances.map(b => (
            <Card key={b.type} className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{b.type}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-display font-bold">{b.remaining}<span className="text-sm font-normal text-muted-foreground">/{b.total}</span></p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My history */}
        <Card className="border-border">
          <CardContent className="p-0">
            {myLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No leave requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left font-medium px-4 py-3">Type</th>
                      <th className="text-left font-medium px-4 py-3">Dates</th>
                      <th className="text-right font-medium px-4 py-3">Days</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                      <th className="text-left font-medium px-4 py-3">Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map(l => (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium">{l.type}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {format(parseISO(l.from), "MMM d")} — {format(parseISO(l.to), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-2.5 text-right">{l.days}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={cn("text-[10px] capitalize border", statusBadge[l.status])}>{l.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{l.approvedBy || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ═══ TEAM SECTION (managers only) ═══ */}
      {isManager && (
        <>
          <Separator />
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Team Requests</h2>
              {isTopManager && teamLeads.length > 0 && (
                <Select value={leadFilter} onValueChange={setLeadFilter}>
                  <SelectTrigger className="w-[200px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="All teams" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teamLeads.map(tl => <SelectItem key={tl.id} value={tl.id}>{tl.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending" className="gap-1.5">
                  Pending {pending.length > 0 && <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px] ml-1">{pending.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>

              {/* Pending */}
              <TabsContent value="pending" className="mt-4">
                {pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No pending requests.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pending.map(l => (
                      <Card key={l.id} className="border-border">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {l.employeeAvatar ? <img src={l.employeeAvatar} className="h-9 w-9 rounded-full" alt="" /> : (
                                <AvatarFallback className="text-xs bg-secondary text-secondary-foreground font-medium">{initials(l.employeeName)}</AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{l.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{l.type} · {l.days} day{l.days > 1 ? "s" : ""}</p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(l.from), "MMM d")} — {format(parseISO(l.to), "MMM d, yyyy")}
                          </div>
                          <p className="text-sm">{l.reason}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm" className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleAction(l.id, "approved")}
                              disabled={actionId === l.id}
                            >
                              {actionId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Approve
                            </Button>
                            <Button
                              size="sm" variant="outline" className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => handleAction(l.id, "rejected")}
                              disabled={actionId === l.id}
                            >
                              {actionId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Approved */}
              <TabsContent value="approved" className="mt-4">
                {approved.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No approved requests.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {approved.map(l => (
                      <Card key={l.id} className="border-border border-emerald-500/20">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-secondary text-secondary-foreground font-medium">{initials(l.employeeName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{l.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{l.type} · {l.days} day{l.days > 1 ? "s" : ""}</p>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] capitalize border", statusBadge.approved)}>Approved</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{format(parseISO(l.from), "MMM d")} — {format(parseISO(l.to), "MMM d, yyyy")}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Rejected */}
              <TabsContent value="rejected" className="mt-4">
                {rejected.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No rejected requests.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rejected.map(l => (
                      <Card key={l.id} className="border-border border-destructive/20">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-secondary text-secondary-foreground font-medium">{initials(l.employeeName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{l.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{l.type} · {l.days} day{l.days > 1 ? "s" : ""}</p>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] capitalize border", statusBadge.rejected)}>Rejected</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{format(parseISO(l.from), "MMM d")} — {format(parseISO(l.to), "MMM d, yyyy")}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </>
      )}

      <RequestLeaveDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onCreated={fetchData} />
    </div>
  );
};

export default Leaves;
