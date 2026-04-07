import { useEffect, useState } from "react";
import IssueFineModal from "@/components/IssueFineModal";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  User, CalendarCheck, Wallet, BarChart3, Activity, Pencil, AlertTriangle,
  Check, X, Clock, Loader2, Download, ChevronLeft, ChevronRight, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isWeekend,
} from "date-fns";

/* ════════ Types ════════ */
interface ShowAssignment { showId: string; showName: string; role: string; episodesThisMonth: number; }
interface AttendanceDay { date: string; status: "present" | "late" | "absent" | "leave" | "weekend"; clockIn?: string; clockOut?: string; lateMinutes?: number; }
interface PayrollRow { id: string; month: string; base: number; fines: number; bonus: number; net: number; paid: boolean; pdfUrl?: string; }
interface FineRow { id: string; date: string; amount: number; reason: string; issuedBy: string; }
interface PerfData {
  views30d: number; views90d: number; retention: number;
  bestEpisode: { id: string; title: string; views: number } | null;
  worstEpisode: { id: string; title: string; views: number } | null;
  trend: { week: string; views: number; retention: number }[];
  compositeScore: number;
  teamAggregate?: { avgViews: number; avgRetention: number; avgScore: number };
}
interface ActivityEntry { id: string; text: string; timestamp: string; }

interface EmployeeProfile {
  id: string; name: string; email: string; role: string; department: string;
  phone: string; joinDate: string; status: "active" | "on_leave" | "inactive";
  avatar?: string;
  stats: { daysPresent: number; tasksCompleted: number; avgQaScore: number | null; activeShows: number };
  attendance: AttendanceDay[];
  showAssignments: ShowAssignment[];
  payroll: PayrollRow[];
  fines: FineRow[];
}

/* ════════ Helpers ════════ */
const initials = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const roleBg: Record<string, string> = {
  admin: "bg-destructive", floor_manager: "bg-purple-600", team_lead: "bg-blue-600",
  researcher: "bg-cyan-600", editor: "bg-amber-600", qa: "bg-emerald-600",
  uploader: "bg-teal-600", accountant: "bg-indigo-600", pending: "bg-muted-foreground",
};
const statusBadge: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  on_leave: { label: "On leave", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  inactive: { label: "Inactive", cls: "bg-muted text-muted-foreground" },
};
const scoreColor = (s: number) => s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-destructive";

/* ════════ Sub-components ════════ */

/* ── Attendance heatmap mini ── */
const MiniHeatmap = ({ days }: { days: AttendanceDay[] }) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dayMap = new Map(days.map(d => [d.date, d.status]));

  const cellColor = (status?: string) => {
    if (!status || status === "weekend") return "bg-muted/40";
    if (status === "present") return "bg-emerald-500";
    if (status === "late") return "bg-amber-500";
    if (status === "absent" || status === "leave") return "bg-destructive";
    return "bg-muted/40";
  };

  return (
    <div>
      <div className="flex gap-0.5 flex-wrap">
        {allDays.map(d => {
          const key = format(d, "yyyy-MM-dd");
          const status = isWeekend(d) ? "weekend" : dayMap.get(key);
          return (
            <div key={key} className={cn("h-5 w-5 rounded-sm", cellColor(status))}
              title={`${format(d, "MMM d")} — ${status || "no data"}`} />
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Present</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />Late</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-destructive" />Absent</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted/40" />Weekend</span>
      </div>
    </div>
  );
};



/* ════════ Main component ════════ */
const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const role = getRole();
  const canEdit = ["admin", "floor_manager"].includes(role);

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fineOpen, setFineOpen] = useState(false);

  /* perf tab */
  const [perf, setPerf] = useState<PerfData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfRange, setPerfRange] = useState<"30" | "90">("30");

  /* attendance tab */
  const [attMonth, setAttMonth] = useState(new Date());
  const [attData, setAttData] = useState<AttendanceDay[]>([]);
  const [attLoading, setAttLoading] = useState(false);

  /* activity tab */
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [actPage, setActPage] = useState(1);
  const [actTotal, setActTotal] = useState(0);
  const [actLoading, setActLoading] = useState(false);

  const fetchProfile = () => {
    if (!id) return;
    setLoading(true);
    api.get<EmployeeProfile>(`/api/employees/${id}`)
      .then(setProfile)
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, [id]);

  /* load perf on tab select */
  const loadPerf = () => {
    if (perf || perfLoading || !id) return;
    setPerfLoading(true);
    api.get<PerfData>(`/api/employees/${id}/performance`)
      .then(setPerf)
      .catch(() => toast.error("Failed to load performance"))
      .finally(() => setPerfLoading(false));
  };

  /* attendance by month */
  const loadAttendance = () => {
    if (!id) return;
    setAttLoading(true);
    const m = format(attMonth, "yyyy-MM");
    api.get<AttendanceDay[]>(`/api/employees/${id}/attendance?month=${m}`)
      .then(setAttData)
      .catch(() => toast.error("Failed to load attendance"))
      .finally(() => setAttLoading(false));
  };
  useEffect(() => { loadAttendance(); }, [attMonth, id]);

  /* activity */
  const loadActivity = () => {
    if (!id) return;
    setActLoading(true);
    api.get<{ items: ActivityEntry[]; total: number }>(`/api/employees/${id}/activity?page=${actPage}`)
      .then(d => { setActivity(d.items); setActTotal(d.total); })
      .catch(() => toast.error("Failed to load activity"))
      .finally(() => setActLoading(false));
  };

  const handleTabChange = (tab: string) => {
    if (tab === "performance") loadPerf();
    if (tab === "activity") loadActivity();
  };

  useEffect(() => { if (actPage > 1) loadActivity(); }, [actPage]);

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Skeleton className="h-20 w-20 rounded-full" /><div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-64" /></div></div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
    </div>
  );

  if (!profile) return <p className="text-sm text-muted-foreground py-12 text-center">Employee not found.</p>;

  const st = statusBadge[profile.status] || statusBadge.active;

  /* payroll totals */
  const payrollTotals = profile.payroll.reduce((acc, p) => ({ base: acc.base + p.base, fines: acc.fines + p.fines, bonus: acc.bonus + p.bonus, net: acc.net + p.net }), { base: 0, fines: 0, bonus: 0, net: 0 });

  /* attendance table for selected month */
  const attAllDays = eachDayOfInterval({ start: startOfMonth(attMonth), end: endOfMonth(attMonth) });
  const attMap = new Map(attData.map(d => [d.date, d]));

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Avatar className="h-20 w-20">
          {profile.avatar ? <img src={profile.avatar} className="h-20 w-20 rounded-full" alt="" /> : (
            <AvatarFallback className={cn("text-2xl font-display font-bold text-white", roleBg[profile.role] || "bg-primary")}>
              {initials(profile.name)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold">{profile.name}</h1>
            <Badge variant="outline" className="capitalize">{profile.role.replace("_", " ")}</Badge>
            <Badge variant="outline" className={cn("border", st.cls)}>{st.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{profile.department} · Joined {format(parseISO(profile.joinDate), "MMM yyyy")}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="h-3.5 w-3.5" />Edit</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setFineOpen(true)}>
              <AlertTriangle className="h-3.5 w-3.5" />Issue Fine
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* ═══ Tabs ═══ */}
      <Tabs defaultValue="overview" onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5"><User className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Performance</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5"><CalendarCheck className="h-3.5 w-3.5" />Attendance</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5"><Wallet className="h-3.5 w-3.5" />Payroll</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Activity</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Overview ── */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Days Present", value: profile.stats.daysPresent, icon: CalendarCheck },
              { label: "Tasks Completed", value: profile.stats.tasksCompleted, icon: Check },
              { label: "Avg QA Score", value: profile.stats.avgQaScore !== null ? `${profile.stats.avgQaScore}/10` : "N/A", icon: BarChart3 },
              { label: "Active Shows", value: profile.stats.activeShows, icon: TrendingUp },
            ].map(s => (
              <Card key={s.label} className="border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><s.icon className="h-3.5 w-3.5" />{s.label}</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-display font-bold">{s.value}</div></CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Attendance — {format(new Date(), "MMMM yyyy")}</CardTitle></CardHeader>
            <CardContent><MiniHeatmap days={profile.attendance} /></CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Show Assignments</CardTitle></CardHeader>
            <CardContent>
              {profile.showAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No current assignments.</p>
              ) : (
                <div className="space-y-2">
                  {profile.showAssignments.map(sa => (
                    <Link key={sa.showId} to={`/shows/${sa.showId}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{sa.showName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{sa.role.replace("_", " ")}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{sa.episodesThisMonth} ep/mo</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: Performance ── */}
        <TabsContent value="performance" className="mt-4 space-y-6">
          {perfLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !perf ? (
            <p className="text-sm text-muted-foreground text-center py-12">No performance data available.</p>
          ) : (
            <>
              <div className="flex gap-2 items-center">
                <Button variant={perfRange === "30" ? "default" : "outline"} size="sm" onClick={() => setPerfRange("30")}>30 days</Button>
                <Button variant={perfRange === "90" ? "default" : "outline"} size="sm" onClick={() => setPerfRange("90")}>90 days</Button>
              </div>

              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-display font-bold">{(perfRange === "30" ? perf.views30d : perf.views90d).toLocaleString()}</div></CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Retention</CardTitle></CardHeader>
                  <CardContent><div className={cn("text-2xl font-display font-bold", scoreColor(perf.retention))}>{perf.retention}%</div></CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Best Episode</CardTitle></CardHeader>
                  <CardContent>
                    {perf.bestEpisode ? (
                      <Link to={`/episodes/${perf.bestEpisode.id}`} className="text-sm font-medium text-primary hover:underline">{perf.bestEpisode.title}</Link>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Worst Episode</CardTitle></CardHeader>
                  <CardContent>
                    {perf.worstEpisode ? (
                      <Link to={`/episodes/${perf.worstEpisode.id}`} className="text-sm font-medium text-destructive hover:underline">{perf.worstEpisode.title}</Link>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </CardContent>
                </Card>
              </div>

              {/* Trend chart */}
              {perf.trend.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Week-over-Week Trend</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={perf.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="retention" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Composite score */}
              <Card className="border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Composite Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <span className={cn("text-4xl font-display font-bold", scoreColor(perf.compositeScore))}>{perf.compositeScore}</span>
                    <div className="flex-1">
                      <Progress value={perf.compositeScore} className="h-3" />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>0</span><span>50</span><span>100</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team aggregate for leads */}
              {perf.teamAggregate && (
                <Card className="border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Team Aggregate</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><p className="text-xs text-muted-foreground">Avg Views</p><p className="text-lg font-bold font-display">{perf.teamAggregate.avgViews.toLocaleString()}</p></div>
                      <div><p className="text-xs text-muted-foreground">Avg Retention</p><p className="text-lg font-bold font-display">{perf.teamAggregate.avgRetention}%</p></div>
                      <div><p className="text-xs text-muted-foreground">Avg Score</p><p className="text-lg font-bold font-display">{perf.teamAggregate.avgScore}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── TAB 3: Attendance ── */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAttMonth(prev => subMonths(prev, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium min-w-[120px] text-center">{format(attMonth, "MMMM yyyy")}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAttMonth(prev => addMonths(prev, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => toast.info("Export triggered")}>
              <Download className="h-3.5 w-3.5" />Export
            </Button>
          </div>

          {/* Calendar grid */}
          <Card className="border-border">
            <CardContent className="pt-4">
              {attLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] text-muted-foreground font-medium">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: getDay(startOfMonth(attMonth)) }).map((_, i) => <div key={`pad-${i}`} />)}
                    {attAllDays.map(d => {
                      const key = format(d, "yyyy-MM-dd");
                      const rec = attMap.get(key);
                      const status = isWeekend(d) ? "weekend" : rec?.status;
                      const bg = !status || status === "weekend" ? "bg-muted/30" : status === "present" ? "bg-emerald-500/20 text-emerald-400" : status === "late" ? "bg-amber-500/20 text-amber-400" : "bg-destructive/20 text-destructive";
                      return (
                        <div key={key} className={cn("h-9 rounded-md flex items-center justify-center text-xs font-medium", bg)}>
                          {format(d, "d")}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Attendance table */}
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left font-medium px-4 py-3">Date</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                      <th className="text-left font-medium px-4 py-3">Clock In</th>
                      <th className="text-left font-medium px-4 py-3">Clock Out</th>
                      <th className="text-right font-medium px-4 py-3">Late (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-muted-foreground py-6">No records for this month.</td></tr>
                    ) : attData.map(d => (
                      <tr key={d.date} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium">{format(parseISO(d.date), "EEE, MMM d")}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={cn("text-[10px] capitalize",
                            d.status === "present" ? "text-emerald-400 border-emerald-500/20" :
                            d.status === "late" ? "text-amber-400 border-amber-500/20" :
                            "text-destructive border-destructive/20"
                          )}>{d.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{d.clockIn || "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{d.clockOut || "—"}</td>
                        <td className="px-4 py-2.5 text-right">{d.lateMinutes ? <span className="text-amber-400">{d.lateMinutes}</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: Payroll ── */}
        <TabsContent value="payroll" className="mt-4 space-y-6">
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left font-medium px-4 py-3">Month</th>
                      <th className="text-right font-medium px-4 py-3">Base</th>
                      <th className="text-right font-medium px-4 py-3">Fines</th>
                      <th className="text-right font-medium px-4 py-3">Bonus</th>
                      <th className="text-right font-medium px-4 py-3">Net</th>
                      <th className="text-center font-medium px-4 py-3">Status</th>
                      <th className="text-center font-medium px-4 py-3">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.payroll.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-muted-foreground py-6">No payroll records.</td></tr>
                    ) : profile.payroll.map(p => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium">{p.month}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">₨ {p.base.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">{p.fines > 0 ? <span className="text-destructive">-₨ {p.fines.toLocaleString()}</span> : "—"}</td>
                        <td className="px-4 py-2.5 text-right">{p.bonus > 0 ? <span className="text-emerald-400">+₨ {p.bonus.toLocaleString()}</span> : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">₨ {p.net.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-center">
                          {p.paid ? <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">Paid</Badge> : <Badge variant="outline" className="text-[10px]">Pending</Badge>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {p.pdfUrl ? <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground mx-auto" /></a> : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {profile.payroll.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border font-semibold">
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-right">₨ {payrollTotals.base.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-destructive">-₨ {payrollTotals.fines.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">+₨ {payrollTotals.bonus.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">₨ {payrollTotals.net.toLocaleString()}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Fine history */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Fine History</h3>
            {profile.fines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fines on record.</p>
            ) : (
              <div className="space-y-2">
                {profile.fines.map(f => (
                  <div key={f.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">₨ {f.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{f.reason}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Issued by {f.issuedBy} · {f.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB 5: Activity ── */}
        <TabsContent value="activity" className="mt-4">
          {actLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No activity recorded.</p>
          ) : (
            <div className="space-y-4">
              <div className="relative border-l border-border pl-4 space-y-4">
                {activity.map(a => (
                  <div key={a.id} className="relative">
                    <div className="absolute -left-[22px] h-3 w-3 rounded-full bg-muted-foreground border-2 border-background" />
                    <p className="text-sm">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground">{a.timestamp}</p>
                  </div>
                ))}
              </div>
              {actTotal > activity.length && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={actPage <= 1} onClick={() => setActPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setActPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Fine modal */}
      <IssueFineModal
        open={fineOpen}
        onOpenChange={setFineOpen}
        employeeId={id || ""}
        employeeName={profile.name}
        onCreated={fetchProfile}
      />
    </div>
  );
};

export default EmployeeDetail;
