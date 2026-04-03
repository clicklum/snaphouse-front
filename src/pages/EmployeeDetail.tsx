import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { User, CalendarCheck, Wallet, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  baseSalary: number;
  joinDate: string;
  status: "active" | "inactive";
  attendance: {
    present: number;
    absent: number;
    late: number;
    totalDays: number;
  };
  payroll: PayrollEntry[];
  performance: {
    views: number;
    retention: number;
    qaScore: number;
    compositeScore: number;
    episodesDelivered: number;
  };
}

interface PayrollEntry {
  id: string;
  month: string;
  baseSalary: number;
  bonus: number;
  fines: number;
  netPay: number;
}

const getInitials = (n: string) => n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
const scoreColor = (s: number) => (s >= 80 ? "text-emerald-500" : s >= 70 ? "text-blue-500" : s >= 60 ? "text-amber-500" : "text-destructive");
const scoreBg = (s: number) => (s >= 80 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : s >= 70 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : s >= 60 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-destructive/10 text-destructive border-destructive/20");

const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
    </div>
  </div>
);

const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<EmployeeProfile>(`/api/employees/${id}`)
      .then(setProfile)
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <p className="text-sm text-muted-foreground">Employee not found.</p>;

  const attendanceRate = profile.attendance.totalDays > 0
    ? Math.round((profile.attendance.present / profile.attendance.totalDays) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl bg-primary text-primary-foreground font-display font-bold">
            {getInitials(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold">{profile.name}</h1>
            <Badge variant={profile.status === "active" ? "default" : "secondary"} className="capitalize">{profile.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{profile.email} · {profile.phone}</p>
          <p className="text-sm text-muted-foreground">{profile.role} · {profile.department} · Joined {new Date(profile.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList>
          <TabsTrigger value="attendance" className="gap-1.5"><CalendarCheck className="h-3.5 w-3.5" />Attendance</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5"><Wallet className="h-3.5 w-3.5" />Payroll</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Performance</TabsTrigger>
        </TabsList>

        {/* Attendance */}
        <TabsContent value="attendance" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-display font-bold">{profile.attendance.present}</div></CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-display font-bold text-destructive">{profile.attendance.absent}</div></CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Late</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-display font-bold text-amber-500">{profile.attendance.late}</div></CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-bold">{attendanceRate}%</div>
                <Progress value={attendanceRate} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll" className="mt-4">
          <Card className="border-border">
            <CardContent className="p-0">
              {profile.payroll.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No payroll records.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left font-medium px-6 py-3">Month</th>
                        <th className="text-right font-medium px-4 py-3">Base</th>
                        <th className="text-right font-medium px-4 py-3">Bonus</th>
                        <th className="text-right font-medium px-4 py-3">Fines</th>
                        <th className="text-right font-medium px-6 py-3">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.payroll.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="px-6 py-3 font-medium text-foreground">{p.month}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">₨ {p.baseSalary.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-500">+₨ {p.bonus.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right ${p.fines > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {p.fines > 0 ? `-₨ ${p.fines.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-6 py-3 text-right font-semibold text-foreground">₨ {p.netPay.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-display font-bold">{profile.performance.views.toLocaleString()}</div></CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Retention</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-display font-bold ${scoreColor(profile.performance.retention)}`}>{profile.performance.retention}%</div></CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">QA Score</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-display font-bold ${scoreColor(profile.performance.qaScore)}`}>{profile.performance.qaScore}</div></CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Episodes Delivered</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-display font-bold">{profile.performance.episodesDelivered}</div></CardContent>
            </Card>
            <Card className="border-border col-span-full sm:col-span-1 lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Composite Score</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <span className={`text-3xl font-display font-bold ${scoreColor(profile.performance.compositeScore)}`}>
                    {profile.performance.compositeScore}
                  </span>
                  <Badge variant="outline" className={`${scoreBg(profile.performance.compositeScore)} text-sm font-bold`}>
                    {profile.performance.compositeScore >= 80 ? "Excellent" : profile.performance.compositeScore >= 70 ? "Good" : profile.performance.compositeScore >= 60 ? "Average" : "Needs Improvement"}
                  </Badge>
                </div>
                <Progress value={profile.performance.compositeScore} className="h-2 mt-3" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetail;
