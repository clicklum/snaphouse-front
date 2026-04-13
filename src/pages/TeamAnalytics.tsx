import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronUp, ChevronDown, Download, HelpCircle, FileText,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface BaseRow {
  id: string;
  name: string;
  compositeScore: number;
}
interface EditorRow extends BaseRow {
  shows: number; episodesEdited: number; totalViews: number;
  avgRetention: number; avgRevisionRounds: number; avgTurnaroundDays: number; qaPassRate: number;
}
interface ResearcherRow extends BaseRow {
  shows: number; scriptsDelivered: number; onTimeRate: number;
  avgViews: number; qaScriptPassRate: number;
}
interface LeadRow extends BaseRow {
  shows: number; teamEpisodeOutput: number; teamAvgViews: number;
  teamOnTimeRate: number; qaRejectionRate: number;
}
interface ManagerRow extends BaseRow {
  teamsOverseen: number; totalOutput: number; totalViews: number;
  avgRetention: number; finesIssued: number;
}

type RoleTab = "all" | "editor" | "researcher" | "team_lead" | "floor_manager";

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

const scoreCls = (s: number) =>
  s >= 80 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" :
  s >= 60 ? "bg-amber-500/15 text-amber-400 border-amber-500/20" :
  "bg-destructive/15 text-destructive border-destructive/20";

const pctCls = (p: number) => p >= 80 ? "text-emerald-400" : p >= 60 ? "text-amber-400" : "text-destructive";

/* ── Sortable header helper ── */
interface ColDef { key: string; label: string; align?: "left" | "right"; }

const SortableTable = <T extends BaseRow>({
  columns,
  data,
  onRowClick,
}: {
  columns: ColDef[];
  data: T[];
  onRowClick: (row: T) => void;
}) => {
  const [sortKey, setSortKey] = useState("compositeScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggle = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    const list = [...data];
    list.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (typeof av === "string") {
        const cmp = av.toLowerCase().localeCompare(bv.toLowerCase());
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [data, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left font-medium px-4 py-3 w-8">#</th>
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  "font-medium px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap",
                  col.align === "left" ? "text-left" : "text-right"
                )}
                onClick={() => toggle(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr
              key={row.id}
              className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onRowClick(row)}
            >
              <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
              {columns.map(col => {
                const val = (row as any)[col.key];
                /* special rendering */
                if (col.key === "compositeScore") {
                  return (
                    <td key={col.key} className="px-4 py-3 text-right">
                      <Badge variant="outline" className={cn("font-bold", scoreCls(val))}>{val}</Badge>
                    </td>
                  );
                }
                if (col.key === "name") {
                  return <td key={col.key} className="px-4 py-3 font-medium">{val}</td>;
                }
                /* percentage columns */
                if (typeof col.label === "string" && (col.label.includes("%") || col.label.includes("Rate") || col.label.includes("rate"))) {
                  return <td key={col.key} className={cn("px-4 py-3 text-right font-medium", pctCls(val))}>{val}%</td>;
                }
                /* number */
                if (typeof val === "number") {
                  return <td key={col.key} className="px-4 py-3 text-right text-muted-foreground">{val >= 1000 ? formatNum(val) : val}</td>;
                }
                return <td key={col.key} className="px-4 py-3 text-right text-muted-foreground">{val ?? "—"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Column definitions per role ── */
const editorCols: ColDef[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "shows", label: "Shows" },
  { key: "episodesEdited", label: "Episodes" },
  { key: "totalViews", label: "Views" },
  { key: "avgRetention", label: "Avg Ret %" },
  { key: "avgRevisionRounds", label: "Avg Revisions" },
  { key: "avgTurnaroundDays", label: "Avg Days" },
  { key: "qaPassRate", label: "QA Pass %" },
  { key: "compositeScore", label: "Score" },
];

const researcherCols: ColDef[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "shows", label: "Shows" },
  { key: "scriptsDelivered", label: "Scripts" },
  { key: "onTimeRate", label: "On-time %" },
  { key: "avgViews", label: "Avg Views" },
  { key: "qaScriptPassRate", label: "Script Pass %" },
  { key: "compositeScore", label: "Score" },
];

const leadCols: ColDef[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "shows", label: "Shows" },
  { key: "teamEpisodeOutput", label: "Team Output" },
  { key: "teamAvgViews", label: "Team Avg Views" },
  { key: "teamOnTimeRate", label: "On-time %" },
  { key: "qaRejectionRate", label: "QA Rej %" },
  { key: "compositeScore", label: "Score" },
];

const managerCols: ColDef[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "teamsOverseen", label: "Teams" },
  { key: "totalOutput", label: "Output" },
  { key: "totalViews", label: "Views" },
  { key: "avgRetention", label: "Avg Ret %" },
  { key: "finesIssued", label: "Fines" },
  { key: "compositeScore", label: "Score" },
];

/* ══════ Main ══════ */
const TeamAnalytics = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleTab>("all");
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);

  const [editors, setEditors] = useState<EditorRow[]>([]);
  const [researchers, setResearchers] = useState<ResearcherRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [managers, setManagers] = useState<ManagerRow[]>([]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const roleParam = role === "all" ? "" : `&role=${role}`;
    api.get<{
      editors: EditorRow[];
      researchers: ResearcherRow[];
      teamLeads: LeadRow[];
      floorManagers: ManagerRow[];
    }>(`/analytics/team?range=${range}${roleParam}`)
      .then(d => {
        setEditors(d.editors || []);
        setResearchers(d.researchers || []);
        setLeads(d.teamLeads || []);
        setManagers(d.floorManagers || []);
      })
      .catch(() => toast.error("Failed to load team analytics"))
      .finally(() => setLoading(false));
  }, [range, role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const goToEmployee = (row: BaseRow) => navigate(`/employees/${row.id}?tab=performance`);

  const exportFile = (type: "csv" | "pdf") => {
    const token = getToken();
    const a = document.createElement("a");
    a.href = `${API_BASE}/analytics/export?type=team&range=${range}&format=${type}&token=${token}`;
    a.download = `team-analytics-${range}d.${type}`;
    a.click();
  };

  const showEditors = role === "all" || role === "editor";
  const showResearchers = role === "all" || role === "researcher";
  const showLeads = role === "all" || role === "team_lead";
  const showManagers = role === "all" || role === "floor_manager";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Team Performance</h1>
            <p className="text-sm text-muted-foreground mt-1">Individual scores and leaderboards</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
              <p className="font-semibold mb-1">Composite Score (0–100)</p>
              <p>Views weight 40% · Retention 30% · Delivery speed 20% · QA rate 10%</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {RANGES.map(r => (
            <Button key={r.value} variant={range === r.value ? "default" : "outline"} size="sm" onClick={() => setRange(r.value)}>
              {r.label}
            </Button>
          ))}
          <div className="h-5 w-px bg-border mx-1" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportFile("csv")}>
            <Download className="h-3.5 w-3.5" />CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportFile("pdf")}>
            <FileText className="h-3.5 w-3.5" />PDF
          </Button>
        </div>
      </div>

      {/* Role tabs */}
      <Tabs value={role} onValueChange={v => setRole(v as RoleTab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="editor">Editors</TabsTrigger>
          <TabsTrigger value="researcher">Researchers</TabsTrigger>
          <TabsTrigger value="team_lead">Team Leads</TabsTrigger>
          <TabsTrigger value="floor_manager">Floor Managers</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex gap-4 items-center">
                    <Skeleton className="h-4 w-6" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /><Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Editors */}
          {showEditors && editors.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-0">
                <CardTitle className="font-display text-base">Editors</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <SortableTable columns={editorCols} data={editors} onRowClick={goToEmployee} />
              </CardContent>
            </Card>
          )}

          {/* Researchers */}
          {showResearchers && researchers.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-0">
                <CardTitle className="font-display text-base">Researchers</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <SortableTable columns={researcherCols} data={researchers} onRowClick={goToEmployee} />
              </CardContent>
            </Card>
          )}

          {/* Team Leads */}
          {showLeads && leads.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-0">
                <CardTitle className="font-display text-base">Team Leads</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <SortableTable columns={leadCols} data={leads} onRowClick={goToEmployee} />
              </CardContent>
            </Card>
          )}

          {/* Floor Managers */}
          {showManagers && managers.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-0">
                <CardTitle className="font-display text-base">Floor Managers</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <SortableTable columns={managerCols} data={managers} onRowClick={goToEmployee} />
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {editors.length === 0 && researchers.length === 0 && leads.length === 0 && managers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No team data available for this period.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamAnalytics;
