import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { toast } from "sonner";
import { differenceInHours, differenceInMinutes, isPast, parseISO } from "date-fns";
import {
  Check, Loader2, Send, Paperclip, Upload, Download,
  Clock, AlertTriangle, RotateCcw, ArrowUpRight,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

/* ── types ── */
interface Person { id: string; name: string; avatar?: string; role?: string; }
interface Attachment { id: string; filename: string; uploadedBy: string; date: string; url: string; }
interface Revision { round: number; rejectedBy: string; reason: string; sentBack: string; resolved: string | null; }
interface ActivityEntry { id: string; text: string; timestamp: string; }

interface TaskDetail {
  id: string;
  type: string; // Research / Edit / QA / Verify
  episodeTitle: string;
  showName: string;
  priority: "high" | "medium" | "low";
  assignee: Person;
  deadline: string;
  createdBy: string;
  createdAt: string;
  description: string;
  attachments: Attachment[];
  revisions: Revision[];
  activity: ActivityEntry[];
}

const priorityDot: Record<string, string> = { high: "bg-destructive", medium: "bg-amber-500", low: "bg-muted-foreground" };
const typeBadge: Record<string, string> = {
  Research: "bg-blue-500/15 text-blue-400",
  Edit: "bg-amber-500/15 text-amber-400",
  QA: "bg-purple-500/15 text-purple-400",
  Verify: "bg-cyan-500/15 text-cyan-400",
};

const Initials = ({ name, avatar, size = "h-7 w-7" }: { name: string; avatar?: string; size?: string }) =>
  avatar ? <img src={avatar} className={`${size} rounded-full`} alt="" /> : (
    <div className={`flex ${size} items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground`}>
      {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );

interface TaskDetailDrawerProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

const TaskDetailDrawer = ({ taskId, open, onOpenChange, onUpdated }: TaskDetailDrawerProps) => {
  const role = getRole();
  const isLeadOrAdmin = ["admin", "team_lead", "floor_manager"].includes(role);

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);

  /* description editing */
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [descSaving, setDescSaving] = useState(false);

  /* revision request */
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [revisionSending, setRevisionSending] = useState(false);

  /* actions */
  const [completing, setCompleting] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const fetchTask = () => {
    if (!taskId) return;
    setLoading(true);
    apiFetch<TaskDetail>(`/api/tasks/${taskId}`)
      .then(t => { setTask(t); setDescDraft(t.description); })
      .catch(() => toast.error("Failed to load task"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open && taskId) fetchTask(); }, [open, taskId]);

  /* deadline label */
  const deadlineLabel = useMemo(() => {
    if (!task) return null;
    const dl = parseISO(task.deadline);
    if (isPast(dl)) return { text: "Overdue", color: "text-destructive" };
    const mins = differenceInMinutes(dl, new Date());
    const hrs = differenceInHours(dl, new Date());
    if (hrs < 6) return { text: `Due in ${hrs}h ${mins % 60}m`, color: "text-amber-400" };
    if (hrs < 24) return { text: `Due in ${hrs}h`, color: "text-muted-foreground" };
    return { text: `Due in ${Math.ceil(hrs / 24)}d`, color: "text-muted-foreground" };
  }, [task]);

  /* actions */
  const saveDesc = async () => {
    setDescSaving(true);
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ description: descDraft }) });
      toast.success("Description updated");
      setDescEditing(false);
      fetchTask();
      onUpdated?.();
    } catch { toast.error("Failed to save"); }
    finally { setDescSaving(false); }
  };

  const markComplete = async () => {
    setCompleting(true);
    try {
      await apiFetch(`/api/tasks/${taskId}/complete`, { method: "PATCH" });
      toast.success("Task marked complete");
      onOpenChange(false);
      onUpdated?.();
    } catch { toast.error("Failed to complete"); }
    finally { setCompleting(false); }
  };

  const requestRevision = async () => {
    if (!revisionReason.trim()) return;
    setRevisionSending(true);
    try {
      await apiFetch(`/api/tasks/${taskId}/revision`, { method: "POST", body: JSON.stringify({ reason: revisionReason }) });
      toast.success("Revision requested");
      setRevisionOpen(false);
      setRevisionReason("");
      fetchTask();
      onUpdated?.();
    } catch { toast.error("Failed to request revision"); }
    finally { setRevisionSending(false); }
  };

  const escalate = async () => {
    setEscalating(true);
    try {
      await apiFetch(`/api/tasks/${taskId}/escalate`, { method: "POST" });
      toast.success("Escalated — Slack alert sent");
      fetchTask();
      onUpdated?.();
    } catch { toast.error("Escalation failed"); }
    finally { setEscalating(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE || "https://api.dailyvertex.io"}/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("snaphouse_jwt") || ""}` },
        body: formData,
      });
      toast.success("File uploaded");
      fetchTask();
    } catch { toast.error("Upload failed"); }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {loading || !task ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* ── Header ── */}
            <SheetHeader className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", typeBadge[task.type] || "bg-muted text-muted-foreground")}>{task.type}</span>
                <div className={cn("h-2.5 w-2.5 rounded-full", priorityDot[task.priority])} title={`${task.priority} priority`} />
              </div>
              <SheetTitle className="font-display text-lg">{task.episodeTitle}</SheetTitle>
              <SheetDescription>{task.showName}</SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              {/* ── Assignment ── */}
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignment</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
                    <div className="flex items-center gap-2">
                      <Initials name={task.assignee.name} avatar={task.assignee.avatar} size="h-6 w-6" />
                      <div>
                        <p className="font-medium text-sm">{task.assignee.name}</p>
                        {task.assignee.role && <p className="text-[10px] text-muted-foreground capitalize">{task.assignee.role}</p>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                    <p className="text-sm">{parseISO(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    {deadlineLabel && <p className={cn("text-xs font-medium flex items-center gap-1 mt-0.5", deadlineLabel.color)}><Clock className="h-3 w-3" />{deadlineLabel.text}</p>}
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Created by <span className="text-foreground font-medium">{task.createdBy}</span> · {task.createdAt}</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Description ── */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
                  {!descEditing && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setDescEditing(true)}>Edit</Button>}
                </div>
                {descEditing ? (
                  <div className="space-y-2">
                    <Textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} rows={5} className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveDesc} disabled={descSaving}>{descSaving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDescEditing(false); setDescDraft(task.description); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description || "No description."}</p>
                )}
              </section>

              <Separator />

              {/* ── File Attachments ── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attachments</h4>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Upload className="h-3 w-3" />Upload</span>
                  </label>
                </div>
                {task.attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">No attachments.</p>
                ) : (
                  <div className="space-y-1.5">
                    {task.attachments.map(f => (
                      <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors">
                        <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.filename}</p>
                          <p className="text-[10px] text-muted-foreground">{f.uploadedBy} · {f.date}</p>
                        </div>
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Revision History ── */}
              {task.revisions.length > 0 && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revision History</h4>
                    <div className="space-y-3">
                      {task.revisions.map((rev, i) => (
                        <div key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">Round {rev.round}</Badge>
                            {rev.resolved ? <Badge variant="secondary" className="text-[10px]">Resolved</Badge> : <Badge variant="destructive" className="text-[10px]">Open</Badge>}
                          </div>
                          <p className="text-sm"><span className="text-muted-foreground">Rejected by</span> <span className="font-medium">{rev.rejectedBy}</span></p>
                          <p className="text-sm text-muted-foreground">{rev.reason}</p>
                          <p className="text-[10px] text-muted-foreground">Sent back: {rev.sentBack}{rev.resolved ? ` · Resolved: ${rev.resolved}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <Separator />

              {/* ── Activity Log ── */}
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</h4>
                {task.activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">No activity yet.</p>
                ) : (
                  <div className="relative border-l border-border pl-4 space-y-3">
                    {task.activity.map(a => (
                      <div key={a.id} className="relative">
                        <Circle className="absolute -left-[22px] h-3 w-3 fill-muted-foreground text-muted-foreground" />
                        <p className="text-sm">{a.text}</p>
                        <p className="text-[10px] text-muted-foreground">{a.timestamp}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {/* ── Actions ── */}
              <section className="space-y-3 pb-4">
                <Button className="w-full" onClick={markComplete} disabled={completing}>
                  {completing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Mark Complete
                </Button>

                {role === "qa" && (
                  revisionOpen ? (
                    <div className="space-y-2 rounded border p-3">
                      <Textarea placeholder="Reason for revision…" value={revisionReason} onChange={e => setRevisionReason(e.target.value)} rows={3} className="text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={requestRevision} disabled={revisionSending || !revisionReason.trim()}>
                          {revisionSending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Submit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRevisionOpen(false); setRevisionReason(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setRevisionOpen(true)}>
                      <RotateCcw className="mr-2 h-4 w-4" />Request Revision
                    </Button>
                  )
                )}

                {isLeadOrAdmin && (
                  <Button variant="outline" className="w-full text-amber-500 border-amber-500/30 hover:bg-amber-500/10" onClick={escalate} disabled={escalating}>
                    {escalating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                    Escalate
                  </Button>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetailDrawer;
