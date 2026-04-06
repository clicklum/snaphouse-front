import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Pencil, Archive, Plus, UserPlus, Loader2, Check, X,
  TrendingUp, Eye, Percent, HardDrive, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ── types ── */
interface Show {
  id: string; name: string; status: "Active" | "Paused" | "Archived";
  snapchatProfileId: string; category: string; language: string;
  cadence: string; pcloudFolder: string; targetViews: number;
  qaThreshold: number; maxRevisions: number; slackChannel: string;
}
interface ShowStats { episodesThisMonth: number; views30d: number; retention30d: number; pcloudVerified: number; }
interface Episode {
  id: string; number: number; title: string;
  researcher: { id: string; name: string; avatar?: string };
  editor: { id: string; name: string; avatar?: string };
  stage: string; deadline: string; views: number; retention: number; pcloudVerified: boolean;
}
interface TeamMember {
  id: string; name: string; avatar?: string; role: string; roleOnShow: string;
  episodesThisMonth: number; avgScore: number;
}
interface SnapchatInsights {
  viewsPerDay: { date: string; views: number }[];
  retentionPerEpisode: { episode: string; retention: number }[];
  demographics: { ageGroups: { label: string; pct: number }[]; gender: { label: string; pct: number }[]; countries: { name: string; pct: number }[]; };
}
interface StaffOption { id: string; name: string; }

const statusColor = (s: string) => s === "Active" ? "default" : s === "Paused" ? "secondary" : "outline";
const stageColor = (s: string) => {
  const m: Record<string, string> = { Research: "bg-blue-500/15 text-blue-400", Edit: "bg-amber-500/15 text-amber-400", QA: "bg-purple-500/15 text-purple-400", Verify: "bg-cyan-500/15 text-cyan-400", Done: "bg-green-500/15 text-green-400" };
  return m[s] || "bg-muted text-muted-foreground";
};
const scoreColor = (s: number) => s >= 80 ? "text-green-500" : s >= 70 ? "text-blue-400" : s >= 60 ? "text-amber-400" : "text-destructive";
const currency = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString();
const Avatar = ({ name, avatar }: { name: string; avatar?: string }) => (
  <div className="flex items-center gap-2">
    {avatar ? <img src={avatar} className="h-6 w-6 rounded-full" alt="" /> : (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
        {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
      </div>
    )}
    <span className="text-sm">{name}</span>
  </div>
);

const ShowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = getRole();
  const isLeadOrAdmin = ["admin", "team_lead", "floor_manager"].includes(role);

  const [show, setShow] = useState<Show | null>(null);
  const [stats, setStats] = useState<ShowStats | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [insights, setInsights] = useState<SnapchatInsights | null>(null);
  const [insightRange, setInsightRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  /* new episode drawer */
  const [epDrawer, setEpDrawer] = useState(false);
  const [epForm, setEpForm] = useState({ title: "", publishDate: "", researcherId: "", editorId: "", deadlineResearch: "", deadlineEdit: "", deadlineQa: "", deadlineVerify: "" });
  const [epSaving, setEpSaving] = useState(false);
  const [researchers, setResearchers] = useState<StaffOption[]>([]);
  const [editors, setEditors] = useState<StaffOption[]>([]);

  /* assign member modal */
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignResults, setAssignResults] = useState<StaffOption[]>([]);
  const [assignSelected, setAssignSelected] = useState<string>("");
  const [assignRole, setAssignRole] = useState("primary");
  const [assignSaving, setAssignSaving] = useState(false);

  /* settings */
  const [settingsForm, setSettingsForm] = useState<Show | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      apiFetch<Show>(`/api/shows/${id}`),
      apiFetch<ShowStats>(`/api/shows/${id}/stats`),
      apiFetch<Episode[]>(`/api/shows/${id}/episodes`),
      apiFetch<TeamMember[]>(`/api/shows/${id}/team`),
    ]).then(([s, st, ep, tm]) => {
      setShow(s); setStats(st); setEpisodes(ep); setTeam(tm); setSettingsForm(s);
    }).catch(() => toast.error("Failed to load show")).finally(() => setLoading(false));
  };

  const fetchInsights = () => {
    apiFetch<SnapchatInsights>(`/api/shows/${id}/snapchat?range=${insightRange}`).then(setInsights).catch(() => toast.error("Failed to load insights"));
  };

  useEffect(() => { fetchAll(); }, [id]);
  useEffect(() => { fetchInsights(); }, [id, insightRange]);

  /* staff options */
  useEffect(() => {
    apiFetch<StaffOption[]>(`/api/shows/${id}/staff?role=researcher`).then(setResearchers).catch(() => {});
    apiFetch<StaffOption[]>(`/api/shows/${id}/staff?role=editor`).then(setEditors).catch(() => {});
  }, [id]);

  const handleArchive = async () => {
    setArchiving(true);
    try { await apiFetch(`/api/shows/${id}/archive`, { method: "PATCH" }); toast.success("Show archived"); navigate("/shows", { replace: true }); }
    catch { toast.error("Failed to archive"); }
    finally { setArchiving(false); setArchiveOpen(false); }
  };

  const handleNewEpisode = async () => {
    setEpSaving(true);
    try { await apiFetch(`/api/shows/${id}/episodes`, { method: "POST", body: JSON.stringify(epForm) }); toast.success("Episode created"); setEpDrawer(false); fetchAll(); }
    catch { toast.error("Failed to create episode"); }
    finally { setEpSaving(false); }
  };

  const handleAssignSearch = (q: string) => {
    setAssignSearch(q);
    if (q.length < 2) { setAssignResults([]); return; }
    apiFetch<StaffOption[]>(`/api/employees/search?q=${encodeURIComponent(q)}`).then(setAssignResults).catch(() => {});
  };

  const handleAssign = async () => {
    if (!assignSelected) return;
    setAssignSaving(true);
    try { await apiFetch(`/api/shows/${id}/team`, { method: "POST", body: JSON.stringify({ employeeId: assignSelected, role: assignRole }) }); toast.success("Member assigned"); setAssignOpen(false); fetchAll(); }
    catch { toast.error("Failed to assign"); }
    finally { setAssignSaving(false); }
  };

  const handleSettingsSave = async () => {
    if (!settingsForm) return;
    setSettingsSaving(true);
    try { await apiFetch(`/api/shows/${id}`, { method: "PATCH", body: JSON.stringify(settingsForm) }); toast.success("Settings saved"); fetchAll(); }
    catch { toast.error("Save failed"); }
    finally { setSettingsSaving(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      <Skeleton className="h-96 w-full" />
    </div>
  );

  if (!show) return <p className="text-muted-foreground">Show not found.</p>;

  const grouped = team.reduce<Record<string, TeamMember[]>>((acc, m) => { (acc[m.role] ||= []).push(m); return acc; }, {});

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <button onClick={() => navigate("/shows")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1"><ChevronLeft className="h-3 w-3" />Back to shows</button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold">{show.name}</h1>
            <Badge variant={statusColor(show.status)}>{show.status}</Badge>
          </div>
          <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{show.snapchatProfileId}</code>
        </div>
        {isLeadOrAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/shows/${id}?tab=settings`)}><Pencil className="mr-1 h-3 w-3" />Edit</Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setArchiveOpen(true)}><Archive className="mr-1 h-3 w-3" />Archive</Button>
          </div>
        )}
      </div>

      {/* ── stats ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Episodes this month", value: stats.episodesThisMonth, icon: TrendingUp },
            { label: "Views (30d)", value: currency(stats.views30d), icon: Eye },
            { label: "Avg Retention", value: `${stats.retention30d}%`, icon: Percent },
            { label: "pCloud Verified", value: `${stats.pcloudVerified}%`, icon: HardDrive },
          ].map((s) => (
            <Card key={s.label}><CardContent className="flex items-center gap-4 p-5">
              <s.icon className="h-7 w-7 text-primary" />
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* ── tabs ── */}
      <Tabs defaultValue="episodes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="snapchat">Snapchat Insights</TabsTrigger>
          {isLeadOrAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* ═══ TAB 1: Episodes ═══ */}
        <TabsContent value="episodes">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Episodes</CardTitle>
              {isLeadOrAdmin && <Button size="sm" onClick={() => setEpDrawer(true)}><Plus className="mr-1 h-3 w-3" />New Episode</Button>}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Title</TableHead><TableHead>Researcher</TableHead><TableHead>Editor</TableHead>
                  <TableHead>Stage</TableHead><TableHead>Deadline</TableHead><TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Retention</TableHead><TableHead className="text-center">pCloud</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {episodes.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">No episodes yet.</TableCell></TableRow>}
                  {episodes.map((ep) => (
                    <TableRow key={ep.id} className="cursor-pointer" onClick={() => navigate(`/episodes/${ep.id}`)}>
                      <TableCell className="font-mono text-muted-foreground">{ep.number}</TableCell>
                      <TableCell className="font-medium">{ep.title}</TableCell>
                      <TableCell><Avatar name={ep.researcher.name} avatar={ep.researcher.avatar} /></TableCell>
                      <TableCell><Avatar name={ep.editor.name} avatar={ep.editor.avatar} /></TableCell>
                      <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageColor(ep.stage)}`}>{ep.stage}</span></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{ep.deadline}</TableCell>
                      <TableCell className="text-right">{currency(ep.views)}</TableCell>
                      <TableCell className="text-right">{ep.retention}%</TableCell>
                      <TableCell className="text-center">{ep.pcloudVerified ? <Check className="mx-auto h-4 w-4 text-green-500" /> : <X className="mx-auto h-4 w-4 text-destructive" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 2: Team ═══ */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Team Members</CardTitle>
              {isLeadOrAdmin && <Button size="sm" onClick={() => setAssignOpen(true)}><UserPlus className="mr-1 h-3 w-3" />Assign Member</Button>}
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(grouped).map(([role, members]) => (
                <div key={role}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{role}s</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                        {m.avatar ? <img src={m.avatar} className="h-9 w-9 rounded-full" alt="" /> : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5">{m.roleOnShow}</Badge>
                            <span>{m.episodesThisMonth} eps</span>
                            <span className={scoreColor(m.avgScore)}>{m.avgScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {team.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No team members assigned.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 3: Snapchat Insights ═══ */}
        <TabsContent value="snapchat">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              {["7", "30", "90"].map((r) => (
                <Button key={r} size="sm" variant={insightRange === r ? "default" : "outline"} onClick={() => setInsightRange(r)}>{r}d</Button>
              ))}
            </div>

            {!insights ? <Skeleton className="h-64 w-full" /> : (
              <>
                {/* Views line chart */}
                <Card><CardHeader><CardTitle className="text-base">Views per Day</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={insights.viewsPerDay}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Retention bar chart */}
                <Card><CardHeader><CardTitle className="text-base">Retention per Episode</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.retentionPerEpisode}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="episode" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="retention" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Demographics */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Age Groups</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {insights.demographics.ageGroups.map((a) => (
                        <div key={a.label} className="space-y-1"><div className="flex justify-between text-xs"><span>{a.label}</span><span className="font-medium">{a.pct}%</span></div><Progress value={a.pct} className="h-2" /></div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Gender</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {insights.demographics.gender.map((g) => (
                        <div key={g.label} className="space-y-1"><div className="flex justify-between text-xs"><span>{g.label}</span><span className="font-medium">{g.pct}%</span></div><Progress value={g.pct} className="h-2" /></div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Top Countries</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {insights.demographics.countries.map((c) => (
                        <div key={c.name} className="space-y-1"><div className="flex justify-between text-xs"><span>{c.name}</span><span className="font-medium">{c.pct}%</span></div><Progress value={c.pct} className="h-2" /></div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ═══ TAB 4: Settings ═══ */}
        {isLeadOrAdmin && (
          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle className="text-base">Show Settings</CardTitle><CardDescription>Edit configuration for this show.</CardDescription></CardHeader>
              {settingsForm && (
                <CardContent className="space-y-5 max-w-xl">
                  <div className="space-y-2"><Label>Show Name</Label><Input value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Snapchat Profile ID</Label><Input value={settingsForm.snapchatProfileId} onChange={(e) => setSettingsForm({ ...settingsForm, snapchatProfileId: e.target.value })} className="font-mono" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Category</Label>
                      <Select value={settingsForm.category} onValueChange={(v) => setSettingsForm({ ...settingsForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["Entertainment", "Education", "Lifestyle", "News", "Comedy", "Sports", "Tech"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Language</Label><Input value={settingsForm.language} onChange={(e) => setSettingsForm({ ...settingsForm, language: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Episode Cadence</Label>
                    <Select value={settingsForm.cadence} onValueChange={(v) => setSettingsForm({ ...settingsForm, cadence: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["Daily", "3x week", "Weekly"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>pCloud Folder Path</Label><Input value={settingsForm.pcloudFolder} onChange={(e) => setSettingsForm({ ...settingsForm, pcloudFolder: e.target.value })} className="font-mono text-sm" /></div>
                  <div className="space-y-2"><Label>Target Views per Episode</Label><Input type="number" value={settingsForm.targetViews} onChange={(e) => setSettingsForm({ ...settingsForm, targetViews: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Thumbnail Template</Label><Input type="file" accept="image/*" /></div>
                  <div className="space-y-2">
                    <Label>QA Pass Threshold: {settingsForm.qaThreshold}/10</Label>
                    <Slider min={1} max={10} step={1} value={[settingsForm.qaThreshold]} onValueChange={([v]) => setSettingsForm({ ...settingsForm, qaThreshold: v })} />
                  </div>
                  <div className="space-y-2"><Label>Max Revision Rounds</Label><Input type="number" min={1} max={20} value={settingsForm.maxRevisions} onChange={(e) => setSettingsForm({ ...settingsForm, maxRevisions: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Slack Channel</Label><Input value={settingsForm.slackChannel} onChange={(e) => setSettingsForm({ ...settingsForm, slackChannel: e.target.value })} placeholder="#show-channel" /></div>
                  <Button onClick={handleSettingsSave} disabled={settingsSaving}>{settingsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Settings</Button>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Archive confirm dialog ── */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent><DialogHeader>
          <DialogTitle>Archive "{show.name}"?</DialogTitle>
          <DialogDescription>This will hide the show from active views. Episodes and data are preserved. You can restore it later.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button variant="destructive" onClick={handleArchive} disabled={archiving}>{archiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Archive</Button>
        </DialogFooter></DialogContent>
      </Dialog>

      {/* ── New Episode drawer ── */}
      <Sheet open={epDrawer} onOpenChange={setEpDrawer}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>New Episode</SheetTitle><SheetDescription>Create a new episode for {show.name}.</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={epForm.title} onChange={(e) => setEpForm({ ...epForm, title: e.target.value })} placeholder="Episode title" /></div>
            <div className="space-y-2"><Label>Publish Date</Label><Input type="date" value={epForm.publishDate} onChange={(e) => setEpForm({ ...epForm, publishDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Researcher</Label>
              <Select value={epForm.researcherId} onValueChange={(v) => setEpForm({ ...epForm, researcherId: v })}>
                <SelectTrigger><SelectValue placeholder="Select researcher" /></SelectTrigger>
                <SelectContent>{researchers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Editor</Label>
              <Select value={epForm.editorId} onValueChange={(v) => setEpForm({ ...epForm, editorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select editor" /></SelectTrigger>
                <SelectContent>{editors.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-xs">Research deadline</Label><Input type="date" value={epForm.deadlineResearch} onChange={(e) => setEpForm({ ...epForm, deadlineResearch: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-xs">Edit deadline</Label><Input type="date" value={epForm.deadlineEdit} onChange={(e) => setEpForm({ ...epForm, deadlineEdit: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-xs">QA deadline</Label><Input type="date" value={epForm.deadlineQa} onChange={(e) => setEpForm({ ...epForm, deadlineQa: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-xs">Verify deadline</Label><Input type="date" value={epForm.deadlineVerify} onChange={(e) => setEpForm({ ...epForm, deadlineVerify: e.target.value })} /></div>
            </div>
            <Button className="w-full" onClick={handleNewEpisode} disabled={epSaving || !epForm.title}>{epSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Episode</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Assign member modal ── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent><DialogHeader>
          <DialogTitle>Assign Team Member</DialogTitle>
          <DialogDescription>Search for an employee and assign them to this show.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Search Employee</Label><Input value={assignSearch} onChange={(e) => handleAssignSearch(e.target.value)} placeholder="Type a name…" /></div>
          {assignResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded border divide-y">
              {assignResults.map((r) => (
                <button key={r.id} onClick={() => { setAssignSelected(r.id); setAssignSearch(r.name); setAssignResults([]); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${assignSelected === r.id ? "bg-muted font-medium" : ""}`}>{r.name}</button>
              ))}
            </div>
          )}
          <div className="space-y-2"><Label>Role on Show</Label>
            <Select value={assignRole} onValueChange={setAssignRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="backup">Backup</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleAssign} disabled={!assignSelected || assignSaving}>{assignSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign</Button>
        </DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
};

export default ShowDetail;
