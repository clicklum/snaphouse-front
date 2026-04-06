import { useEffect, useState, useCallback, useMemo } from "react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { apiFetch, API_BASE } from "@/lib/api";
import { getRole, getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, UserCheck, UserX, Clock, FileText,
  MoreHorizontal, Check, X, Download, Users, Pencil, CalendarDays,
  Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface AttendanceData {
  stats: { presentToday: number; absentToday: number; lateToday: number; pendingLeaves: number };
  records: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
}
interface AttendanceRecord {
  id: string; employeeId: string; employeeName: string;
  status: "present" | "late" | "absent" | "leave" | "half_day";
  clockIn: string | null; clockOut: string | null;
  lateMinutes: number; monthlyPresent: number; monthlyTotal: number;
}
interface LeaveRequest {
  id: string; employeeName: string; type: string;
  startDate: string; endDate: string; reason: string;
  status: "pending" | "approved" | "rejected";
}
interface SummaryData {
  workingDays: number; attendanceRate: number;
  mostAbsent: { name: string; days: number } | null;
  mostLate: { name: string; minutes: number } | null;
}
interface EmployeeOption { id: string; name: string; }

const OVERRIDE_STATUSES = ["present", "late", "absent", "half_day", "leave"] as const;

const getInitials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const statusBadge = (s: string) => {
  switch (s) {
    case "present": return "default" as const;
    case "late": return "secondary" as const;
    case "absent": return "destructive" as const;
    default: return "outline" as const;
  }
};

/* ── Skeleton helpers ── */
const StatSkeleton = () => (
  <Card className="border-border"><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
);
const TableSkeleton = () => (
  <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="flex items-center gap-4"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-4 w-14" /><Skeleton className="h-4 w-14" /><Skeleton className="h-4 w-10" /></div>
  ))}</div>
);

/* ══════ Override Popover ══════ */
const OverridePopover = ({ record, onDone }: { record: AttendanceRecord; onDone: () => void }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(record.status);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/attendance/${record.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note.trim() || undefined }),
      });
      toast.success("Status updated");
      setOpen(false);
      onDone();
    } catch { toast.error("Failed to update status"); }
    finally { setSaving(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manual Override</p>
        <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OVERRIDE_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} rows={2} className="text-sm" />
        <Button size="sm" className="w-full" onClick={submit} disabled={saving || status === record.status}>
          {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}Save
        </Button>
      </PopoverContent>
    </Popover>
  );
};

/* ══════ Bulk Absent Modal ══════ */
const BulkAbsentModal = ({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<EmployeeOption[]>("/api/employees?fields=id,name")
      .then(setEmployees)
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!date || selected.size === 0) return;
    setSaving(true);
    try {
      await apiFetch("/api/attendance/bulk", {
        method: "POST",
        body: JSON.stringify({ date: format(date, "yyyy-MM-dd"), employeeIds: Array.from(selected), status: "absent" }),
      });
      toast.success(`Marked ${selected.size} employee${selected.size > 1 ? "s" : ""} absent`);
      onOpenChange(false);
      setSelected(new Set());
      onDone();
    } catch { toast.error("Bulk update failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Mark Absent</DialogTitle>
          <DialogDescription>Select a date and employees to mark absent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start h-9 font-normal text-sm", !date && "text-muted-foreground")}>
                  <CalendarDays className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Employees</Label>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-2">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggle(emp.id)} />
                    <span className="text-sm">{emp.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{selected.size} selected</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={saving || selected.size === 0 || !date}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Mark Absent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ══════ Main Page ══════ */
const Attendance = () => {
  const role = getRole();
  const isAdmin = role === "admin";
  const canManage = ["admin", "floor_manager"].includes(role);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  /* summary */
  const [summary, setSummary] = useState<SummaryData | null>(null);

  /* late grace */
  const [grace, setGrace] = useState(15);
  const [graceEditing, setGraceEditing] = useState(false);
  const [graceDraft, setGraceDraft] = useState("15");
  const [graceSaving, setGraceSaving] = useState(false);

  /* bulk modal */
  const [bulkOpen, setBulkOpen] = useState(false);

  const monthStr = format(month, "yyyy-MM");

  const fetchData = useCallback(() => {
    setLoading(true);
    const promises: Promise<void>[] = [
      apiFetch<AttendanceData>(`/api/attendance?month=${monthStr}`).then(setData),
      apiFetch<SummaryData>(`/api/attendance/summary?month=${monthStr}`).then(setSummary).catch(() => {}),
    ];
    if (isAdmin) {
      promises.push(
        apiFetch<{ lateGraceMinutes: number }>("/api/admin/settings")
          .then(s => { setGrace(s.lateGraceMinutes); setGraceDraft(String(s.lateGraceMinutes)); })
          .catch(() => {})
      );
    }
    Promise.all(promises)
      .catch(() => toast.error("Failed to load attendance"))
      .finally(() => setLoading(false));
  }, [monthStr, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLeaveAction = async (leaveId: string, action: "approved" | "rejected") => {
    try {
      await apiFetch(`/api/leaves/${leaveId}`, { method: "PATCH", body: JSON.stringify({ status: action }) });
      toast.success(`Leave ${action}`);
      fetchData();
    } catch { toast.error(`Failed to ${action} leave`); }
  };

  const saveGrace = async () => {
    const val = Number(graceDraft);
    if (isNaN(val) || val < 0) return;
    setGraceSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ lateGraceMinutes: val }) });
      setGrace(val);
      setGraceEditing(false);
      toast.success("Grace period updated");
    } catch { toast.error("Failed to save"); }
    finally { setGraceSaving(false); }
  };

  const exportCSV = () => {
    const token = getToken();
    const url = `${API_BASE}/api/attendance/export?month=${monthStr}`;
    const a = document.createElement("a");
    a.href = `${url}&token=${token}`;
    a.download = `attendance-${monthStr}.csv`;
    a.click();
  };

  const stats = data ? [
    { label: "Present Today", value: data.stats.presentToday, icon: UserCheck, color: "text-emerald-400" },
    { label: "Absent Today", value: data.stats.absentToday, icon: UserX, color: "text-destructive" },
    { label: "Late Today", value: data.stats.lateToday, icon: Clock, color: "text-amber-400" },
    { label: "Pending Leaves", value: data.stats.pendingLeaves, icon: FileText, color: "text-primary" },
  ] : null;

  const pendingLeaves = data?.leaveRequests.filter(l => l.status === "pending") || [];

  return (
    <div className="space-y-6">
      {/* ═══ Late policy banner (admin) ═══ */}
      {isAdmin && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          {graceEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-muted-foreground">Late grace period:</span>
              <Input type="number" min={0} className="w-20 h-7 text-sm" value={graceDraft} onChange={e => setGraceDraft(e.target.value)} />
              <span className="text-sm text-muted-foreground">minutes</span>
              <Button size="sm" className="h-7" onClick={saveGrace} disabled={graceSaving}>
                {graceSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => { setGraceEditing(false); setGraceDraft(String(grace)); }}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm">Late grace period: <strong>{grace} minutes</strong></span>
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => setGraceEditing(true)}>
                <Pencil className="h-3 w-3" />Edit
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Daily records and leave management</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkOpen(true)}>
              <Users className="h-3.5 w-3.5" />Bulk Mark Absent
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" />Export CSV
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMonth(m => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm font-medium min-w-[120px] text-center">{format(month, "MMMM yyyy")}</div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* ═══ Stats ═══ */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) :
          stats?.map(s => (
            <Card key={s.label} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </CardHeader>
              <CardContent><div className="text-2xl font-display font-bold">{s.value}</div></CardContent>
            </Card>
          ))}
      </div>

      {/* ═══ Attendance Table ═══ */}
      <Card className="border-border">
        <CardHeader><CardTitle className="font-display text-lg">Daily Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <TableSkeleton /> : !data?.records.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">No records for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium px-6 py-3">Employee</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Clock In</th>
                    <th className="text-left font-medium px-4 py-3">Clock Out</th>
                    <th className="text-right font-medium px-4 py-3">Late (min)</th>
                    <th className="text-right font-medium px-4 py-3">Monthly</th>
                    {canManage && <th className="text-right font-medium px-6 py-3">Override</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.records.map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">{getInitials(r.employeeName)}</AvatarFallback></Avatar>
                          <span className="font-medium">{r.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant={statusBadge(r.status)} className="capitalize">{r.status.replace("_", " ")}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{r.clockIn || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.clockOut || "—"}</td>
                      <td className={cn("px-4 py-3 text-right", r.lateMinutes > 0 ? "text-amber-400 font-medium" : "text-muted-foreground")}>{r.lateMinutes > 0 ? r.lateMinutes : "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.monthlyPresent}/{r.monthlyTotal}</td>
                      {canManage && (
                        <td className="px-6 py-3 text-right">
                          <OverridePopover record={r} onDone={fetchData} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Summary Panel ═══ */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Working Days</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-display font-bold">{summary.workingDays}</div></CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-display font-bold">{summary.attendanceRate}%</div></CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-destructive" />Most Absent</CardTitle></CardHeader>
            <CardContent>
              {summary.mostAbsent ? (
                <div><p className="text-sm font-medium">{summary.mostAbsent.name}</p><p className="text-xs text-muted-foreground">{summary.mostAbsent.days} days</p></div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" />Most Late</CardTitle></CardHeader>
            <CardContent>
              {summary.mostLate ? (
                <div><p className="text-sm font-medium">{summary.mostLate.name}</p><p className="text-xs text-muted-foreground">{summary.mostLate.minutes} total minutes</p></div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Pending Leave Requests ═══ */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Pending Leave Requests
            {pendingLeaves.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{pendingLeaves.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : pendingLeaves.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending leave requests.</p>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map(leave => (
                <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{leave.employeeName}</span>
                      <Badge variant="outline" className="text-xs">{leave.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(leave.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(leave.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {leave.reason && <p className="text-xs text-muted-foreground mt-0.5 truncate">{leave.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive hover:text-destructive" onClick={() => handleLeaveAction(leave.id, "rejected")}><X className="h-3.5 w-3.5" />Reject</Button>
                    <Button size="sm" className="h-8 gap-1" onClick={() => handleLeaveAction(leave.id, "approved")}><Check className="h-3.5 w-3.5" />Approve</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk modal */}
      <BulkAbsentModal open={bulkOpen} onOpenChange={setBulkOpen} onDone={fetchData} />
    </div>
  );
};

export default Attendance;
