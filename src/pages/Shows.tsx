import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Search, MoreHorizontal, Eye, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import NewShowSheet from "@/components/NewShowSheet";

interface Show {
  id: string;
  name: string;
  teamLead: { name: string; avatar?: string };
  episodeCount: number;
  views30d: number;
  retentionPct: number;
  status: "active" | "paused" | "archived";
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "active":
      return "default" as const;
    case "paused":
      return "secondary" as const;
    case "archived":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const TableSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    ))}
  </div>
);

const Shows = () => {
  const navigate = useNavigate();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchShows = () => {
    setLoading(true);
    apiFetch<Show[]>("/api/shows")
      .then(setShows)
      .catch(() => toast.error("Failed to load shows"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShows();
  }, []);

  const filtered = useMemo(() => {
    let list = shows;
    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.teamLead.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [shows, search, statusFilter]);

  const handleArchive = async (id: string) => {
    try {
      await apiFetch(`/api/shows/${id}/archive`, { method: "PATCH" });
      toast.success("Show archived");
      fetchShows();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive show");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Shows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage production shows and schedules
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Show
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shows or team leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {shows.length === 0 ? "No shows yet. Create your first show." : "No shows match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium px-6 py-3">Show Name</th>
                    <th className="text-left font-medium px-4 py-3">Team Lead</th>
                    <th className="text-right font-medium px-4 py-3">Episodes</th>
                    <th className="text-right font-medium px-4 py-3">Views (30d)</th>
                    <th className="text-left font-medium px-4 py-3 min-w-[140px]">Retention %</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-right font-medium px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((show) => (
                    <tr
                      key={show.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/shows/${show.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {show.name}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                              {getInitials(show.teamLead.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-foreground whitespace-nowrap">
                            {show.teamLead.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-muted-foreground">
                        {show.episodeCount}
                      </td>
                      <td className="px-4 py-4 text-right text-muted-foreground">
                        {formatNumber(show.views30d)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={show.retentionPct}
                            className="h-2 flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-9 text-right">
                            {show.retentionPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={statusBadgeVariant(show.status)} className="capitalize">
                          {show.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/shows/${show.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/shows/${show.id}?edit=true`);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(show.id);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
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

      {/* New Show Sheet */}
      <NewShowSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={fetchShows}
      />
    </div>
  );
};

export default Shows;
