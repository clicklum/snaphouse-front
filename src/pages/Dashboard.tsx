import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardSkeleton, TableSkeleton, ChartSkeleton } from "@/components/PageSkeletons";
import { PageError } from "@/components/PageStates";
import { Badge } from "@/components/ui/badge";
import { Film, Users, Eye, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Types
interface SummaryData {
  activeShows: number;
  totalEmployees: number;
  totalViews30d: number;
  avgRetention: number;
}

interface Episode {
  id: string;
  showName: string;
  stage: string;
  deadline: string;
}

interface WeeklyView {
  day: string;
  views: number;
}

const stageBadgeVariant = (stage: string) => {
  const s = stage.toLowerCase();
  if (s.includes("edit") || s.includes("post")) return "secondary";
  if (s.includes("review")) return "outline";
  if (s.includes("shoot") || s.includes("production")) return "default";
  if (s.includes("publish") || s.includes("done")) return "default";
  return "secondary";
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
};

/* Skeletons use shared components now */

const statIcons = [Film, Users, Eye, TrendingUp];
const statLabels = ["Active Shows", "Total Employees", "Total Views (30d)", "Avg Retention %"];

const Dashboard = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [weekly, setWeekly] = useState<WeeklyView[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [loadingWeekly, setLoadingWeekly] = useState(true);

  useEffect(() => {
    apiFetch<SummaryData>("/api/analytics/summary")
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoadingSummary(false));

    apiFetch<Episode[]>("/api/episodes/today")
      .then(setEpisodes)
      .catch(() => {})
      .finally(() => setLoadingEpisodes(false));

    apiFetch<WeeklyView[]>("/api/analytics/weekly")
      .then(setWeekly)
      .catch(() => {})
      .finally(() => setLoadingWeekly(false));
  }, []);

  const statValues = summary
    ? [
        { value: summary.activeShows.toString(), sub: "Currently in pipeline" },
        { value: summary.totalEmployees.toString(), sub: "Across all departments" },
        { value: formatNumber(summary.totalViews30d), sub: "Last 30 days" },
        { value: summary.avgRetention + "%", sub: "Average watch time" },
      ]
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back to SnapHouse
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingSummary
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statLabels.map((label, i) => {
              const Icon = statIcons[i];
              return (
                <Card key={label} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold">
                      {statValues?.[i]?.value ?? "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statValues?.[i]?.sub ?? ""}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Bottom Row: Pipeline + Chart */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Episode Pipeline Table */}
        <Card className="border-border lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Episode Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEpisodes ? (
              <TableSkeleton />
            ) : !episodes || episodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No episodes scheduled for today.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-3 text-left font-medium">Show</th>
                      <th className="pb-3 text-left font-medium">Stage</th>
                      <th className="pb-3 text-right font-medium">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {episodes.map((ep) => (
                      <tr
                        key={ep.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3 font-medium text-foreground">
                          {ep.showName}
                        </td>
                        <td className="py-3">
                          <Badge variant={stageBadgeVariant(ep.stage)}>
                            {ep.stage}
                          </Badge>
                        </td>
                        <td className="py-3 text-right text-muted-foreground">
                          {ep.deadline}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Views Chart */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Weekly Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingWeekly ? (
              <ChartSkeleton />
            ) : !weekly || weekly.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weekly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                      fontSize: 13,
                    }}
                    formatter={(value: number) => [
                      formatNumber(value),
                      "Views",
                    ]}
                  />
                  <Bar
                    dataKey="views"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
