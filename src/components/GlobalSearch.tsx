import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, X, Film, Clapperboard, Users, ListTodo,
  Clock, Loader2, ArrowRight,
} from "lucide-react";

/* ── Types ── */
interface ShowResult {
  id: string;
  name: string;
  status: string;
  teamLead: string;
}
interface EpisodeResult {
  id: string;
  title: string;
  showName: string;
  stage: string;
}
interface EmployeeResult {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  email: string;
}
interface TaskResult {
  id: string;
  title: string;
  episodeName: string;
  assignee: string;
  deadline: string;
}
interface SearchResults {
  shows: ShowResult[];
  episodes: EpisodeResult[];
  employees: EmployeeResult[];
  tasks: TaskResult[];
}

const RECENT_KEY = "snaphouse_recent_pages";
const MAX_RECENT = 5;

/* ── Recent pages helpers ── */
interface RecentPage {
  path: string;
  title: string;
  timestamp: number;
}

export function trackPageVisit(path: string, title: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as RecentPage[];
    const filtered = stored.filter(p => p.path !== path);
    filtered.unshift({ path, title, timestamp: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function getRecentPages(): RecentPage[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as RecentPage[];
  } catch {
    return [];
  }
}

/* ── Badge colours ── */
const stageBadge = (stage: string) => {
  const s = stage.toLowerCase();
  if (s.includes("done") || s.includes("complete")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s.includes("progress") || s.includes("edit")) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (s.includes("review") || s.includes("qa")) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
};

const roleBadge = (role: string) => {
  switch (role) {
    case "admin": return "bg-primary/15 text-primary border-primary/30";
    case "editor": return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
    case "researcher": return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "qa": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "team_lead": return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "floor_manager": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const formatRole = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

/* ══════ Component ══════ */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GlobalSearch = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const role = getRole();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const recentPages = getRecentPages();
  const showEmployeeResults = ["admin", "floor_manager", "team_lead"].includes(role);

  /* Focus input when opened */
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* ESC to close */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  /* Debounced search */
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
      setResults(data);
      setActiveIndex(-1);
    } catch {
      setResults({ shows: [], episodes: [], employees: [], tasks: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  /* Build flat list of navigable items for keyboard nav */
  const allItems: { label: string; path: string }[] = [];
  if (results) {
    results.shows.forEach(s => allItems.push({ label: s.name, path: `/shows/${s.id}` }));
    results.episodes.forEach(e => allItems.push({ label: e.title, path: `/episodes/${e.id}` }));
    if (showEmployeeResults) results.employees.forEach(e => allItems.push({ label: e.name, path: `/employees/${e.id}` }));
    results.tasks.forEach(t => allItems.push({ label: t.title, path: `/tasks/${t.id}` }));
  } else if (!query) {
    recentPages.forEach(p => allItems.push({ label: p.title, path: p.path }));
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, allItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIndex >= 0 && allItems[activeIndex]) {
      e.preventDefault();
      goTo(allItems[activeIndex].path);
    }
  };

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const hasResults = results && (
    results.shows.length > 0 ||
    results.episodes.length > 0 ||
    (showEmployeeResults && results.employees.length > 0) ||
    results.tasks.length > 0
  );

  let flatIdx = -1;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      {/* Content */}
      <div className="relative mx-auto mt-[5vh] sm:mt-[10vh] w-full max-w-2xl flex flex-col max-h-[85vh] sm:max-h-[70vh] mx-2 sm:mx-auto rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search shows, episodes, employees, tasks…"
            className="flex-1 h-14 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center h-6 px-1.5 rounded border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Results body */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Loading skeleton */}
          {loading && !results && (
            <div className="px-5 py-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state — recent pages */}
          {!query && !results && (
            <div className="px-2">
              {recentPages.length > 0 ? (
                <>
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</p>
                  {recentPages.map((page, i) => {
                    flatIdx++;
                    const idx = flatIdx;
                    return (
                      <button
                        key={page.path}
                        onClick={() => goTo(page.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors",
                          activeIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{page.title}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                      </button>
                    );
                  })}
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">Type to search across your workspace</p>
              )}
            </div>
          )}

          {/* No results */}
          {results && !hasResults && !loading && (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs mt-1">
                {showEmployeeResults
                  ? "Try searching for a show name, episode, or employee"
                  : "Try searching for a show name or episode title"}
              </p>
            </div>
          )}

          {/* Grouped results */}
          {results && hasResults && (
            <div className="px-2 space-y-1">
              {/* Shows */}
              {results.shows.length > 0 && (
                <ResultSection icon={Film} label="Shows">
                  {results.shows.map(show => {
                    flatIdx++;
                    const idx = flatIdx;
                    return (
                      <ResultRow key={show.id} active={activeIndex === idx} onClick={() => goTo(`/shows/${show.id}`)}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{show.name}</p>
                          <p className="text-xs text-muted-foreground">Lead: {show.teamLead}</p>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", stageBadge(show.status))}>
                          {show.status}
                        </Badge>
                      </ResultRow>
                    );
                  })}
                </ResultSection>
              )}

              {/* Episodes */}
              {results.episodes.length > 0 && (
                <ResultSection icon={Clapperboard} label="Episodes">
                  {results.episodes.map(ep => {
                    flatIdx++;
                    const idx = flatIdx;
                    return (
                      <ResultRow key={ep.id} active={activeIndex === idx} onClick={() => goTo(`/episodes/${ep.id}`)}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ep.title}</p>
                          <p className="text-xs text-muted-foreground">{ep.showName}</p>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", stageBadge(ep.stage))}>
                          {ep.stage}
                        </Badge>
                      </ResultRow>
                    );
                  })}
                </ResultSection>
              )}

              {/* Employees */}
              {showEmployeeResults && results.employees.length > 0 && (
                <ResultSection icon={Users} label="Employees">
                  {results.employees.map(emp => {
                    flatIdx++;
                    const idx = flatIdx;
                    return (
                      <ResultRow key={emp.id} active={activeIndex === idx} onClick={() => goTo(`/employees/${emp.id}`)}>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={emp.avatar} alt={emp.name} />
                          <AvatarFallback className="text-[10px]">{emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{emp.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", roleBadge(emp.role))}>
                          {formatRole(emp.role)}
                        </Badge>
                      </ResultRow>
                    );
                  })}
                </ResultSection>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <ResultSection icon={ListTodo} label="Tasks">
                  {results.tasks.map(task => {
                    flatIdx++;
                    const idx = flatIdx;
                    return (
                      <ResultRow key={task.id} active={activeIndex === idx} onClick={() => goTo(`/tasks/${task.id}`)}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{task.episodeName} · {task.assignee}</p>
                        </div>
                        {task.deadline && (
                          <span className="text-[11px] text-muted-foreground shrink-0">{task.deadline}</span>
                        )}
                      </ResultRow>
                    );
                  })}
                </ResultSection>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-border text-[11px] text-muted-foreground">
          <span><kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px]">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px]">↵</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px]">esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};

/* ── Helpers ── */
function ResultSection({ icon: Icon, label, children }: { icon: typeof Film; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ResultRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      )}
    >
      {children}
    </button>
  );
}

export default GlobalSearch;
