import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Clock, Users, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";

// ---------- types ----------

interface AnalyticsData {
  totalViews: number;
  avgRetention: number;
  uniqueViewers: number;
  subscriberGrowth: number;
  editorLeaderboard: EditorRow[];
  researcherLeaderboard: ResearcherRow[];
}

interface EditorRow {
  id: string;
  name: string;
  views: number;
  retentionPct: number;
  qaScore: number;
  compositeScore: number;
}

interface ResearcherRow {
  id: string;
  name: string;
  scriptsDelivered: number;
  passRate: number;
  avgViews: number;
  compositeScore: number;
}

interface ShowOption {
  id: string;
  name: string;
}

// ---------- helpers ----------

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-500";
  if (score >= 70) return "text-blue-500";
  if (score >= 60) return "text-amber-500";
  return "text-destructive";
};

const scoreBg = (score: number) => {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (score >= 70) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  if (score >= 60) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
};

const ranges = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

// ---------- skeletons ----------

const StatSkeleton = () => (
  <Card className="border-border">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-3 w-16" />
    </CardContent>
  </Card>
);

const TableSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex gap-4 items-center">
        <Skeleton className="h-4 w-6" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    ))}
  </div>
);

// ---------- component ----------

const Analytics = () => {
  const [range, setRange] = useState("30");
  const [showFilter, setShowFilter] = useState("all");
  const [shows, setShows] = useState<ShowOption[]>([]);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Fetch show list once
  useEffect(() => {
    apiFetch<ShowOption[]>("/api/shows")
      .then((res) => {
        if (Array.isArray(res)) {
          setShows(res.map((s: any) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    apiFetch<AnalyticsData>(`/api/analytics?range=${range}&show=${showFilter}`)
      .then(setData)
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [range, showFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `https://api.dailyvertex.io/api/analytics/export?range=${range}&show=${showFilter}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("snaphouse_jwt") || ""}`,
          },
        }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_${range}d_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const stats = data
    ? [
        { label: "Total Views", value: formatNumber(data.totalViews), icon: Eye, sub: `${range}-day total` },
        { label: "Avg Retention", value: data.avgRetention + "%", icon: Clock, sub: "Watch time avg" },
        { label: "Unique Viewers", value: formatNumber(data.uniqueViewers), icon: Users, sub: "Distinct users" },
        {
          label: "Subscriber Growth",
          value: (data.subscriberGrowth >= 0 ? "+" : "") + formatNumber(data.subscriberGrowth),
          icon: TrendingUp,
          sub: "Net new subscribers",
        },
      ]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance insights and leaderboards</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ranges.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={showFilter} onValueChange={setShowFilter}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="All Shows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shows</SelectItem>
            {shows.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : stats?.map((s) => (
              <Card key={s.label} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <s.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-bold">{s.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Leaderboards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor Leaderboard */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Editor Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : !data?.editorLeaderboard?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left font-medium pb-3 pr-2 w-8">#</th>
                      <th className="text-left font-medium pb-3">Name</th>
                      <th className="text-right font-medium pb-3 px-2">Views</th>
                      <th className="text-right font-medium pb-3 px-2">Ret %</th>
                      <th className="text-right font-medium pb-3 px-2">QA</th>
                      <th className="text-right font-medium pb-3 pl-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.editorLeaderboard.map((row, idx) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 font-medium text-foreground">{row.name}</td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {formatNumber(row.views)}
                        </td>
                        <td className={`py-3 px-2 text-right ${scoreColor(row.retentionPct)}`}>
                          {row.retentionPct}%
                        </td>
                        <td className={`py-3 px-2 text-right ${scoreColor(row.qaScore)}`}>
                          {row.qaScore}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <Badge variant="outline" className={`${scoreBg(row.compositeScore)} font-bold`}>
                            {row.compositeScore}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Researcher Leaderboard */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Researcher Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : !data?.researcherLeaderboard?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left font-medium pb-3 pr-2 w-8">#</th>
                      <th className="text-left font-medium pb-3">Name</th>
                      <th className="text-right font-medium pb-3 px-2">Scripts</th>
                      <th className="text-right font-medium pb-3 px-2">Pass %</th>
                      <th className="text-right font-medium pb-3 px-2">Avg Views</th>
                      <th className="text-right font-medium pb-3 pl-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.researcherLeaderboard.map((row, idx) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 font-medium text-foreground">{row.name}</td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {row.scriptsDelivered}
                        </td>
                        <td className={`py-3 px-2 text-right ${scoreColor(row.passRate)}`}>
                          {row.passRate}%
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {formatNumber(row.avgViews)}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <Badge variant="outline" className={`${scoreBg(row.compositeScore)} font-bold`}>
                            {row.compositeScore}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
