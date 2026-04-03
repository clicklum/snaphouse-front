import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, UserCheck, UserX, Clock, FileText, MoreHorizontal, Check, X } from "lucide-react";
import { toast } from "sonner";

interface AttendanceData {
  stats: {
    presentToday: number;
    absentToday: number;
    lateToday: number;
    pendingLeaves: number;
  };
  records: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  status: "present" | "late" | "absent" | "leave";
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  monthlyPresent: number;
  monthlyTotal: number;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

const getInitials = (n: string) => n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const statusBadge = (s: string) => {
  switch (s) {
    case "present": return "default" as const;
    case "late": return "secondary" as const;
    case "absent": return "destructive" as const;
    case "leave": return "outline" as const;
    default: return "secondary" as const;
  }
};

const overrideStatuses = ["present", "late", "absent", "leave"] as const;

const StatSkeleton = () => (
  <Card className="border-border">
    <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
    <CardContent><Skeleton className="h-8 w-12" /></CardContent>
  </Card>
);

const TableSkeleton = () => (
  <div className="space-y-3 p-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-12" />
      </div>
    ))}
  </div>
);

const Attendance = () => {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const monthStr = format(month, "yyyy-MM");

  const fetchData = useCallback(() => {
    setLoading(true);
    apiFetch<AttendanceData>(`/api/attendance?month=${monthStr}`)
      .then(setData)
      .catch(() => toast.error("Failed to load attendance"))
      .finally(() => setLoading(false));
  }, [monthStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOverride = async (recordId: string, newStatus: string) => {
    try {
      await apiFetch(`/api/attendance/${recordId}/override`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Status updated");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleLeaveAction = async (leaveId: string, action: "approved" | "rejected") => {
    try {
      await apiFetch(`/api/leaves/${leaveId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: action }),
      });
      toast.success(`Leave ${action}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} leave`);
    }
  };

  const stats = data
    ? [
        { label: "Present Today", value: data.stats.presentToday, icon: UserCheck, color: "text-emerald-500" },
        { label: "Absent Today", value: data.stats.absentToday, icon: UserX, color: "text-destructive" },
        { label: "Late Today", value: data.stats.lateToday, icon: Clock, color: "text-amber-500" },
        { label: "Pending Leaves", value: data.stats.pendingLeaves, icon: FileText, color: "text-primary" },
      ]
    : null;

  const pendingLeaves = data?.leaveRequests.filter((l) => l.status === "pending") || [];

  return (
    <div className="space-y-6">
      {/* Header + Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Daily records and leave management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-foreground min-w-[120px] text-center">
            {format(month, "MMMM yyyy")}
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : stats?.map((s) => (
              <Card key={s.label} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-bold">{s.value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Attendance Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Daily Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : !data?.records.length ? (
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
                    <th className="text-right font-medium px-6 py-3">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">{getInitials(r.employeeName)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{r.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadge(r.status)} className="capitalize">{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.clockIn || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.clockOut || "—"}</td>
                      <td className={`px-4 py-3 text-right ${r.lateMinutes > 0 ? "text-amber-500 font-medium" : "text-muted-foreground"}`}>
                        {r.lateMinutes > 0 ? r.lateMinutes : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {r.monthlyPresent}/{r.monthlyTotal}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {overrideStatuses.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => handleOverride(r.id, s)}
                                className="capitalize"
                                disabled={r.status === s}
                              >
                                Set as {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Leave Requests */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Pending Leave Requests
            {pendingLeaves.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{pendingLeaves.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : pendingLeaves.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending leave requests.</p>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{leave.employeeName}</span>
                      <Badge variant="outline" className="text-xs">{leave.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(leave.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" — "}
                      {new Date(leave.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {leave.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{leave.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleLeaveAction(leave.id, "rejected")}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => handleLeaveAction(leave.id, "approved")}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
