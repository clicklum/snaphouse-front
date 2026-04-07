import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { toast } from "sonner";
import { differenceInMinutes, differenceInHours, isPast, parseISO } from "date-fns";
import {
  Check, X, ChevronLeft, Loader2, Send, Clock,
  Eye, Percent, ArrowUpRight, Share2, FolderCheck, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

/* ── types ── */
interface Person { id: string; name: string; avatar?: string; }
interface HandoffEntry { stage: string; completedBy: Person; timestamp: string; notes: string; }
interface Note { id: string; author: Person; text: string; createdAt: string; }
interface Assignments { researcher: Person & { deadline: string }; editor: Person & { deadline: string }; qa: Person; verifier: Person; }
interface StatusPanel { scriptSubmitted: boolean; editSubmitted: boolean; qaResult: "pass" | "fail" | null; pcloudVerified: boolean; pcloudVerifiedBy: string; pcloudVerifiedAt: string; revisionsUsed: number; revisionsMax: number; }
interface SnapStats { views: number; retention: number; swipeUps: number; shares: number; }
interface StaffOption { id: string; name: string; }

interface EpisodeData {
  id: string; title: string; number: number;
  showId: string; showName: string;
  stage: string; publishDate: string; deadline: string;
  handoff: HandoffEntry[]; notes: Note[];
  assignments: Assignments; status: StatusPanel;
  snapchat: SnapStats | null;
}

const STAGES = ["Research", "Edit", "QA", "Verify", "Done"];
const stageColor = (s: string) => {
  const m: Record<string, string> = { Research: "bg-blue-500/15 text-blue-400", Edit: "bg-amber-500/15 text-amber-400", QA: "bg-purple-500/15 text-purple-400", Verify: "bg-cyan-500/15 text-cyan-400", Done: "bg-green-500/15 text-green-400" };
  return m[s] || "bg-muted text-muted-foreground";
};
const Tick = ({ ok }: { ok: boolean }) => ok ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-destructive" />;
const Initials = ({ name, avatar, size = "h-7 w-7" }: { name: string; avatar?: string; size?: string }) =>
  avatar ? <img src={avatar} className={`${size} rounded-full`} alt="" /> : (
    <div className={`flex ${size} items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground`}>
      {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );

const EpisodeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const role = getRole();
  const isLeadOrAdmin = ["admin", "team_lead", "floor_manager"].includes(role);

  const [data, setData] = useState<EpisodeData | null>(null);
  const [loading, setLoading] = useState(true);

  /* notes */
  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);

  /* handoff complete */
  const [completeNote, setCompleteNote] = useState("");
  const [completing, setCompleting] = useState<string | null>(null);

  /* QA form */
  const [qaScores, setQaScores] = useState({ pacing: 5, captions: 5, audio: 5, thumbnail: 5, branding: 5 });
  const [qaPass, setQaPass] = useState(true);
  const [qaNotes, setQaNotes] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);
  const qaOverall = useMemo(() => {
    const vals = Object.values(qaScores);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
  }, [qaScores]);

  /* pCloud */
  const [pcloudChecking, setPcloudChecking] = useState(false);
  const [pcloudFound, setPcloudFound] = useState<boolean | null>(null);
  const [pcloudVerifying, setPcloudVerifying] = useState(false);

  /* staff options for reassignment */
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  const fetchData = () => {
    setLoading(true);
    api.get<EpisodeData>(`/episodes/${id}`)
      .then(setData)
      .catch(() => toast.error("Failed to load episode"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => {
    if (data && isLeadOrAdmin) {
      api.get<StaffOption[]>(`/shows/${data.showId}/staff`).then(setStaffOptions).catch(() => {});
    }
  }, [data?.showId]);

  /* deadline label */
  const deadlineLabel = useMemo(() => {
    if (!data) return null;
    const dl = parseISO(data.deadline);
    if (isPast(dl)) return { text: "Overdue", color: "text-destructive" };
    const mins = differenceInMinutes(dl, new Date());
    const hrs = differenceInHours(dl, new Date());
    if (hrs < 6) return { text: `Due in ${hrs}h ${mins % 60}m`, color: "text-amber-400" };
    if (hrs < 24) return { text: `Due in ${hrs}h`, color: "text-muted-foreground" };
    return { text: `Due in ${Math.ceil(hrs / 24)}d`, color: "text-muted-foreground" };
  }, [data]);

  /* actions */
  const sendNote = async () => {
    if (!noteText.trim()) return;
    setNoteSending(true);
    try {
      await api.post(`/episodes/${id}/notes`, { text: noteText });
      setNoteText(""); fetchData();
    } catch { toast.error("Failed to send note"); }
    finally { setNoteSending(false); }
  };

  const markComplete = async (stage: string) => {
    setCompleting(stage);
    try {
      await api.post(`/episodes/${id}/handoff`, { stage, notes: completeNote });
      setCompleteNote(""); toast.success(`${stage} marked complete`); fetchData();
    } catch { toast.error("Failed to complete stage"); }
    finally { setCompleting(null); }
  };

  const submitQa = async () => {
    setQaSubmitting(true);
    try {
      await api.post(`/episodes/${id}/qa`, { scores: qaScores, pass: qaPass, notes: qaNotes });
      toast.success("QA review submitted"); fetchData();
    } catch { toast.error("QA submit failed"); }
    finally { setQaSubmitting(false); }
  };

  const checkPcloud = async () => {
    setPcloudChecking(true);
    try {
      const res = await api.post<{ found: boolean }>(`/episodes/${id}/pcloud-check`);
      setPcloudFound(res.found);
    } catch { toast.error("pCloud check failed"); }
    finally { setPcloudChecking(false); }
  };

  const verifyPcloud = async () => {
    setPcloudVerifying(true);
    try {
      await api.get(`/episodes/${id}/pcloud-verify`);
      toast.success("Marked as verified"); fetchData();
    } catch { toast.error("Verification failed"); }
    finally { setPcloudVerifying(false); }
  };

  const reassign = async (roleKey: string, employeeId: string) => {
    try {
      await api.patch(`/episodes/${id}/assign`, { role: roleKey, employeeId });
      toast.success("Reassigned"); fetchData();
    } catch { toast.error("Reassignment failed"); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!data) return <p className="text-muted-foreground">Episode not found.</p>;

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div>
        <Link to={`/shows/${data.showId}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-3 w-3" />{data.showName}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold">{data.title}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(data.stage)}`}>{data.stage}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Publish: {data.publishDate}</span>
            {deadlineLabel && (
              <span className={`flex items-center gap-1 font-medium ${deadlineLabel.color}`}>
                <Clock className="h-3.5 w-3.5" />{deadlineLabel.text}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ════ LEFT COLUMN ════ */}
        <div className="space-y-6">
          {/* Handoff Thread */}
          <Card>
            <CardHeader><CardTitle className="text-base">Handoff Thread</CardTitle></CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-border pl-6 space-y-6">
                {STAGES.filter(s => s !== "Done").map((stage) => {
                  const entry = data.handoff.find(h => h.stage === stage);
                  const isCurrentStage = data.stage === stage;
                  return (
                    <div key={stage} className="relative">
                      <div className={`absolute -left-[31px] h-4 w-4 rounded-full border-2 ${entry ? "bg-green-500 border-green-500" : isCurrentStage ? "bg-primary border-primary animate-pulse" : "bg-muted border-border"}`} />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{stage}</span>
                          {entry && <span className="text-xs text-muted-foreground">· {entry.timestamp}</span>}
                        </div>
                        {entry ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Initials name={entry.completedBy.name} avatar={entry.completedBy.avatar} size="h-5 w-5" />
                              <span className="text-sm text-muted-foreground">{entry.completedBy.name}</span>
                            </div>
                            {entry.notes && <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{entry.notes}</p>}
                          </div>
                        ) : isCurrentStage ? (
                          <div className="space-y-2 mt-2">
                            <Textarea placeholder="Add a note (optional)…" value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} className="text-sm" rows={2} />
                            <Button size="sm" onClick={() => markComplete(stage)} disabled={!!completing}>
                              {completing === stage ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                              Mark Complete
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Pending</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notes Thread */}
          <Card>
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {data.notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>}
              {data.notes.map((n) => (
                <div key={n.id} className="flex gap-3">
                  <Initials name={n.author.name} avatar={n.author.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{n.author.name}</span>
                      <span className="text-xs text-muted-foreground">{n.createdAt}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.text}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t">
                <Textarea placeholder="Leave a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} className="text-sm" rows={2} />
                <Button size="icon" className="shrink-0 self-end" onClick={sendNote} disabled={noteSending || !noteText.trim()}>
                  {noteSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="space-y-4">
          {/* Assignment Panel */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Assignments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {([
                { key: "researcher", label: "Researcher", person: data.assignments.researcher, deadline: data.assignments.researcher.deadline },
                { key: "editor", label: "Editor", person: data.assignments.editor, deadline: data.assignments.editor.deadline },
                { key: "qa", label: "QA Reviewer", person: data.assignments.qa, deadline: undefined as string | undefined },
                { key: "verifier", label: "Verifier", person: data.assignments.verifier, deadline: undefined as string | undefined },
              ] as const).map(({ key, label, person, deadline }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Initials name={person.name} avatar={person.avatar} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{person.name}</p>
                      <p className="text-[10px] text-muted-foreground">{label}{deadline ? ` · ${deadline}` : ""}</p>
                    </div>
                  </div>
                  {isLeadOrAdmin && (
                    <Select onValueChange={(v) => reassign(key, v)}>
                      <SelectTrigger className="h-7 w-7 p-0 border-0 [&>svg]:hidden"><span className="text-xs text-muted-foreground">✎</span></SelectTrigger>
                      <SelectContent>{staffOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Status Panel */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Script submitted</span><Tick ok={data.status.scriptSubmitted} /></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Edit submitted</span><Tick ok={data.status.editSubmitted} /></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">QA result</span>{data.status.qaResult ? <Badge variant={data.status.qaResult === "pass" ? "default" : "destructive"} className="text-[10px]">{data.status.qaResult}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">pCloud verified</span>
                <div className="flex items-center gap-1.5">
                  <Tick ok={data.status.pcloudVerified} />
                  {data.status.pcloudVerified && <span className="text-[10px] text-muted-foreground">{data.status.pcloudVerifiedBy} · {data.status.pcloudVerifiedAt}</span>}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Revisions</span><span className="font-medium">{data.status.revisionsUsed} of {data.status.revisionsMax}</span></div>
            </CardContent>
          </Card>

          {/* Snapchat Stats */}
          {data.snapchat && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Snapchat Stats</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { label: "Views", value: data.snapchat.views.toLocaleString(), icon: Eye },
                  { label: "Retention", value: `${data.snapchat.retention}%`, icon: Percent },
                  { label: "Swipe-ups", value: data.snapchat.swipeUps.toLocaleString(), icon: ArrowUpRight },
                  { label: "Shares", value: data.snapchat.shares.toLocaleString(), icon: Share2 },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <s.icon className="h-4 w-4 text-primary shrink-0" />
                    <div><p className="text-[10px] text-muted-foreground">{s.label}</p><p className="text-sm font-bold">{s.value}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* QA Review Panel */}
          {role === "qa" && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">QA Review</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(["pacing", "captions", "audio", "thumbnail", "branding"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="capitalize">{k}</span><span className="font-medium">{qaScores[k]}/10</span></div>
                    <Slider min={1} max={10} step={1} value={[qaScores[k]]} onValueChange={([v]) => setQaScores((p) => ({ ...p, [k]: v }))} />
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="text-xs text-muted-foreground">Overall Score</p><p className="text-lg font-bold">{qaOverall}/10</p></div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{qaPass ? "Pass" : "Reject"}</Label>
                    <Switch checked={qaPass} onCheckedChange={setQaPass} />
                  </div>
                </div>
                <Textarea placeholder="QA notes…" value={qaNotes} onChange={(e) => setQaNotes(e.target.value)} rows={3} className="text-sm" />
                <Button className="w-full" onClick={submitQa} disabled={qaSubmitting}>{qaSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit QA Review</Button>
              </CardContent>
            </Card>
          )}

          {/* pCloud Verify Panel */}
          {role === "uploader" && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><FolderCheck className="h-4 w-4" />pCloud Verify</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded border bg-muted/50 p-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Expected file path</p>
                  <p className="text-xs font-mono break-all">/shows/{data.showName}/{data.title}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={checkPcloud} disabled={pcloudChecking}>
                  {pcloudChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderCheck className="mr-2 h-4 w-4" />}Check File
                </Button>
                {pcloudFound === true && <div className="flex items-center gap-2 text-sm text-green-500 font-medium"><Check className="h-4 w-4" />File found</div>}
                {pcloudFound === false && (
                  <div className="flex items-center gap-2 text-sm text-destructive font-medium"><AlertTriangle className="h-4 w-4" />File not found — alert editor</div>
                )}
                <Button className="w-full" onClick={verifyPcloud} disabled={pcloudFound !== true || pcloudVerifying}>
                  {pcloudVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Mark Verified
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodeDetail;
