import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUp, ArrowDown, Download, Eye, ChevronUp, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, ResponsiveContainer,
} from "recharts";

/* ── Types ── */
interface ShowAnalytics {
  id: string;
  name: string;
  status: "active" | "paused" | "archived";
  views: number;
  uniqueViewers: number;
  retention: number;
  subscriberDelta: number;
  swipeUps: number;
  shares: number;
  bestEpisode: { title: string; views: number } | null;
  trend: { value: number }[];
}

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const formatNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

const retentionColor = (r: number) => r >= 70 ? "bg-emerald-500" : r >= 50 ? "bg-amber-500" : "bg-destructive";
const retentionText = (r: number) => r >= 70 ? "text-emerald-400" : r >= 50 ? "text-amber-400" : "text-destructive";

const statusCls: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  archived: "bg-muted text-muted-foreground",
};

type SortKey = "name" | "views" | "uniqueViewers" | "retention" | "swipeUps" | "shares" | "subscriberDelta" | "bestEpisode";

/* ══════ Component ══════ */
const ShowAnalyticsPage = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState("30");
  const [shows, setShows] = useState<ShowAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  /* sort */
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(() => {
    setLoading(true);
    apiFetch<ShowAnalytics[]>(`/api/analytics/shows?range=${range}`)
      .then(setShows)
      .catch(() => toast.error("Failed to load show analytics"))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = useMemo(() => {
    const list = [...shows];
    list.sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (sortKey === "bestEpisode") { av = a.bestEpisode?.views || 0; bv = b.bestEpisode?.views || 0; }
      else { av = a[sortKey]; bv = b[sortKey]; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [shows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  };

  const exportCSV = () => {
    const token = getToken();
    const url = `${API_BASE}/api/analytics/shows/export?range=${range}&token=${token}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `show-analytics-${range}d.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Show Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Snapchat performance by show</p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map(r => (
            <Button key={r.value} variant={range === r.value ? "default" : "outline"} size="sm" onClick={() => setRange(r.value)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Show cards grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : shows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No show data available for this period.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shows.map(show => (
            <Card
              key={show.id}
              className="border-border cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => navigate(`/shows/${show.id}?tab=snapchat`)}
            >
              <CardContent className="p-5 space-y-4">
                {/* Title row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-display font-semibold truncate">{show.name}</h3>
                    <Badge variant="outline" className={cn("text-[10px] capitalize border shrink-0", statusCls[show.status] || "")}>{show.status}</Badge>
                  </div>
                  {/* Sparkline */}
                  {show.trend.length > 1 && (
                    <div className="w-20 h-8 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={show.trend}>
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Views</p>
                    <p className="text-xl font-display font-bold">{formatNum(show.views)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retention</p>
                    <p className={cn("text-xl font-display font-bold", retentionText(show.retention))}>{show.retention}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Subscribers</p>
                    <p className="text-xl font-display font-bold flex items-center gap-1">
                      {show.subscriberDelta >= 0 ? (
                        <><ArrowUp className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">+{formatNum(show.subscriberDelta)}</span></>
                      ) : (
                        <><ArrowDown className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">{formatNum(show.subscriberDelta)}</span></>
                      )}
                    </p>
                  </div>
                </div>

                {/* Retention bar */}
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", retentionColor(show.retention))} style={{ width: `${Math.min(show.retention, 100)}%` }} />
                  </div>
                </div>

                {/* Best episode */}
                {show.bestEpisode && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">Best: <span className="text-foreground font-medium">{show.bestEpisode.title}</span></span>
                    <span className="shrink-0 flex items-center gap-1"><Eye className="h-3 w-3" />{formatNum(show.bestEpisode.views)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison table */}
      {!loading && shows.length > 0 && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Comparison Table</CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" />Export CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    {([
                      ["name", "Show"],
                      ["views", "Views"],
                      ["uniqueViewers", "Unique"],
                      ["retention", "Avg Ret."],
                      ["swipeUps", "Swipe-ups"],
                      ["shares", "Shares"],
                      ["subscriberDelta", "Sub Δ"],
                      ["bestEpisode", "Best Episode"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        className={cn(
                          "font-medium px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none",
                          key === "name" ? "text-left" : "text-right"
                        )}
                        onClick={() => toggleSort(key)}
                      >
                        {label}<SortIcon col={key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/shows/${s.id}?tab=snapchat`)}>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-right">{formatNum(s.views)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatNum(s.uniqueViewers)}</td>
                      <td className={cn("px-4 py-3 text-right font-medium", retentionText(s.retention))}>{s.retention}%</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatNum(s.swipeUps)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatNum(s.shares)}</td>
                      <td className={cn("px-4 py-3 text-right font-medium", s.subscriberDelta >= 0 ? "text-emerald-400" : "text-destructive")}>
                        {s.subscriberDelta >= 0 ? "+" : ""}{formatNum(s.subscriberDelta)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground truncate max-w-[150px]">{s.bestEpisode?.title || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShowAnalyticsPage;
