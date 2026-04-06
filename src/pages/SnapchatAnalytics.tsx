import { useEffect, useState, useCallback, useMemo } from "react";
import { apiFetch, API_BASE } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye, Users, Clock, TrendingUp, RefreshCw, Loader2,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from "recharts";

/* ── Types ── */
interface SnapStats {
  totalViews: number;
  uniqueViewers: number;
  avgRetention: number;
  subscriberDelta: number;
  lastSynced: string;
}

interface TimeseriesPoint { date: string; [showName: string]: string | number; }

interface EpisodeRetention { episodeTitle: string; showName: string; retention: number; }

interface Demographics {
  age: { group: string; pct: number }[];
  gender: { male: number; female: number };
  countries: { code: string; name: string; flag: string; pct: number }[];
}

interface EngagementRow {
  showId: string; showName: string;
  swipeUps: number; shares: number; screenshots: number; favorites: number;
}

interface SnapData {
  stats: SnapStats;
  timeseries: TimeseriesPoint[];
  showNames: string[];
  episodeRetention: EpisodeRetention[];
  demographics: Demographics;
  engagement: EngagementRow[];
}

const RANGES = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
];

const formatNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

const retColor = (r: number) => r >= 70 ? "hsl(var(--chart-2))" : r >= 50 ? "hsl(38, 92%, 50%)" : "hsl(var(--destructive))";
const retText = (r: number) => r >= 70 ? "text-emerald-400" : r >= 50 ? "text-amber-400" : "text-destructive";

/* 6 distinct show colours using HSL from design tokens where possible */
const SHOW_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 80%, 55%)",
  "hsl(280, 65%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(350, 70%, 55%)",
  "hsl(45, 85%, 55%)",
];

type SortKey = "showName" | "swipeUps" | "shares" | "screenshots" | "favorites";

/* ══════ Component ══════ */
const SnapchatAnalytics = () => {
  const role = getRole();
  const isAdmin = role === "admin";

  const [range, setRange] = useState("30");
  const [data, setData] = useState<SnapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  /* engagement sort */
  const [sortKey, setSortKey] = useState<SortKey>("swipeUps");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(() => {
    setLoading(true);
    apiFetch<SnapData>(`/api/analytics/snapchat?range=${range}&breakdown=AGE,GENDER,COUNTRY`)
      .then(setData)
      .catch(() => toast.error("Failed to load Snapchat analytics"))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      await apiFetch("/api/snapchat/sync", { method: "POST" });
      toast.success("Sync started — data will refresh shortly");
      setTimeout(fetchData, 3000);
    } catch { toast.error("Sync failed"); }
    finally { setSyncing(false); }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortedEngagement = useMemo(() => {
    if (!data) return [];
    const list = [...data.engagement];
    list.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  };

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );

  if (!data) return <p className="text-sm text-muted-foreground text-center py-12">No data available.</p>;

  const stats = [
    { label: "Total Views", value: formatNum(data.stats.totalViews), icon: Eye, color: "text-primary" },
    { label: "Unique Viewers", value: formatNum(data.stats.uniqueViewers), icon: Users, color: "text-blue-400" },
    { label: "Avg Retention", value: `${data.stats.avgRetention}%`, icon: Clock, color: retText(data.stats.avgRetention) },
    {
      label: "Subscriber Δ",
      value: (data.stats.subscriberDelta >= 0 ? "+" : "") + formatNum(data.stats.subscriberDelta),
      icon: TrendingUp,
      color: data.stats.subscriberDelta >= 0 ? "text-emerald-400" : "text-destructive",
    },
  ];

  const top20 = data.episodeRetention.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Snapchat Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Company-wide Snapchat Discover data</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Last synced: {data.stats.lastSynced}</span>
          {isAdmin && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={syncNow} disabled={syncing}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Sync now
            </Button>
          )}
        </div>
      </div>

      {/* Range toggle */}
      <div className="flex gap-2">
        {RANGES.map(r => (
          <Button key={r.value} variant={range === r.value ? "default" : "outline"} size="sm" onClick={() => setRange(r.value)}>{r.label}</Button>
        ))}
      </div>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </CardHeader>
            <CardContent><div className="text-2xl font-display font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ Views Trend ═══ */}
      {data.timeseries.length > 0 && (
        <Card className="border-border">
          <CardHeader><CardTitle className="font-display text-base">Views Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.showNames.map((name, i) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={SHOW_COLORS[i % SHOW_COLORS.length]}
                    fill={SHOW_COLORS[i % SHOW_COLORS.length]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ═══ Retention per Episode ═══ */}
      {top20.length > 0 && (
        <Card className="border-border">
          <CardHeader><CardTitle className="font-display text-base">Retention per Episode (Top 20)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={top20.length * 32 + 20}>
              <BarChart data={top20} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <YAxis
                  type="category"
                  dataKey="episodeTitle"
                  width={180}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`${value}%`, "Retention"]}
                />
                <Bar dataKey="retention" radius={[0, 4, 4, 0]}>
                  {top20.map((ep, i) => (
                    <Cell key={i} fill={retColor(ep.retention)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ═══ Demographics ═══ */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Age */}
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Age Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.demographics.age.map(a => (
              <div key={a.group} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{a.group}</span>
                  <span className="font-medium">{a.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${a.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Gender */}
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Gender Split</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-around py-4">
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-blue-400">{data.demographics.gender.male}%</p>
                <p className="text-sm text-muted-foreground mt-1">Male</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-pink-400">{data.demographics.gender.female}%</p>
                <p className="text-sm text-muted-foreground mt-1">Female</p>
              </div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${data.demographics.gender.male}%` }} />
              <div className="h-full bg-pink-500 transition-all" style={{ width: `${data.demographics.gender.female}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Countries */}
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Top Countries</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.demographics.countries.map(c => (
              <div key={c.code} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.flag} {c.name}</span>
                  <span className="font-medium">{c.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Engagement Table ═══ */}
      <Card className="border-border">
        <CardHeader><CardTitle className="font-display text-base">Swipe-ups & Shares</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {([
                    ["showName", "Show"],
                    ["swipeUps", "Swipe-ups"],
                    ["shares", "Shares"],
                    ["screenshots", "Screenshots"],
                    ["favorites", "Favorites"],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      className={cn(
                        "font-medium px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none",
                        key === "showName" ? "text-left" : "text-right"
                      )}
                      onClick={() => toggleSort(key)}
                    >
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEngagement.map(row => (
                  <tr key={row.showId} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.showName}</td>
                    <td className="px-4 py-3 text-right">{formatNum(row.swipeUps)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatNum(row.shares)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatNum(row.screenshots)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatNum(row.favorites)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SnapchatAnalytics;
