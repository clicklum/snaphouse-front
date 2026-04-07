import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

/* ── types ── */
interface StaffOption {
  id: string; name: string; email?: string; avatar?: string;
  currentShows?: number; workload?: number;
}

interface NewShowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/* ── helpers ── */
const Initials = ({ name }: { name: string }) => (
  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
    {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
  </div>
);

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2 mb-4">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < current ? "bg-primary" : "bg-muted")} />
    ))}
    <span className="text-xs text-muted-foreground ml-1">Step {current} of {total}</span>
  </div>
);

const NewShowSheet = ({ open, onOpenChange, onCreated }: NewShowSheetProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  /* ── Step 1 state ── */
  const [name, setName] = useState("");
  const [snapId, setSnapId] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [cadence, setCadence] = useState("daily");
  const [pcloudPath, setPcloudPath] = useState("");
  const [targetViews, setTargetViews] = useState<number | undefined>();
  const [startDate, setStartDate] = useState<Date>();
  const [description, setDescription] = useState("");

  /* ── Step 2 state ── */
  const [leadSearch, setLeadSearch] = useState("");
  const [leads, setLeads] = useState<StaffOption[]>([]);
  const [primaryLead, setPrimaryLead] = useState<string>("");
  const [backupLead, setBackupLead] = useState<string>("");

  /* ── Step 3 state ── */
  const [researcherSearch, setResearcherSearch] = useState("");
  const [allResearchers, setAllResearchers] = useState<StaffOption[]>([]);
  const [selectedResearchers, setSelectedResearchers] = useState<{ id: string; tag: "primary" | "backup"; quota: number }[]>([]);

  /* ── Step 4 state ── */
  const [editorSearch, setEditorSearch] = useState("");
  const [allEditors, setAllEditors] = useState<StaffOption[]>([]);
  const [selectedEditors, setSelectedEditors] = useState<string[]>([]);
  const [rotationMode, setRotationMode] = useState<"round_robin" | "manual">("round_robin");
  const [captionTemplate, setCaptionTemplate] = useState("");

  /* ── Step 5 state ── */
  const [qaLeadId, setQaLeadId] = useState("");
  const [qaReviewers, setQaReviewers] = useState<string[]>([]);
  const [allQa, setAllQa] = useState<StaffOption[]>([]);
  const [criteria, setCriteria] = useState({ pacing: true, captions: true, audio: true, thumbnail: true, branding: true });
  const [minPass, setMinPass] = useState(7);
  const [maxRevisions, setMaxRevisions] = useState(3);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [slackChannel, setSlackChannel] = useState("");

  /* ── Fetch staff on mount ── */
  useEffect(() => {
    if (!open) return;
    api.get<StaffOption[]>("/api/employees?role=team_lead").then(setLeads).catch(() => {});
    api.get<StaffOption[]>("/api/employees?role=researcher").then(setAllResearchers).catch(() => {});
    api.get<StaffOption[]>("/api/employees?role=editor").then(setAllEditors).catch(() => {});
    api.get<StaffOption[]>("/api/employees?role=qa").then(setAllQa).catch(() => {});
  }, [open]);

  /* ── Filtered lists ── */
  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads;
    const q = leadSearch.toLowerCase();
    return leads.filter(l => l.name.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q));
  }, [leads, leadSearch]);

  const filteredResearchers = useMemo(() => {
    if (!researcherSearch.trim()) return allResearchers;
    const q = researcherSearch.toLowerCase();
    return allResearchers.filter(r => r.name.toLowerCase().includes(q));
  }, [allResearchers, researcherSearch]);

  const filteredEditors = useMemo(() => {
    if (!editorSearch.trim()) return allEditors;
    const q = editorSearch.toLowerCase();
    return allEditors.filter(e => e.name.toLowerCase().includes(q));
  }, [allEditors, editorSearch]);

  /* ── Researcher helpers ── */
  const toggleResearcher = (id: string) => {
    setSelectedResearchers(prev =>
      prev.find(r => r.id === id)
        ? prev.filter(r => r.id !== id)
        : [...prev, { id, tag: "primary", quota: 3 }]
    );
  };
  const updateResearcher = (id: string, field: "tag" | "quota", value: string | number) => {
    setSelectedResearchers(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  /* ── Editor helpers ── */
  const toggleEditor = (id: string) => {
    setSelectedEditors(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  /* ── QA helpers ── */
  const toggleQaReviewer = (id: string) => {
    setQaReviewers(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  /* ── Validation ── */
  const canNext = () => {
    switch (step) {
      case 1: return name.trim().length > 0 && snapId.trim().length > 0 && category && language;
      case 2: return !!primaryLead;
      case 3: return selectedResearchers.length > 0;
      case 4: return selectedEditors.length > 0;
      case 5: return !!qaLeadId;
      default: return true;
    }
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await api.post<{ id: string }>("/api/shows", {
          name, snapchatProfileId: snapId, category, language, cadence,
          pcloudFolderPath: pcloudPath, targetViews, startDate: startDate?.toISOString(), description,
          primaryLead, backupLead: backupLead || undefined,
          researchers: selectedResearchers,
          editors: selectedEditors, rotationMode, captionTemplate,
          qaLeadId, qaReviewers, criteria, minPassScore: minPass, maxRevisions, autoEscalate, slackChannel,
        });
      toast.success("Show created · Slack channel created · Team notified");
      onOpenChange(false);
      resetForm();
      onCreated();
      navigate(`/shows/${res.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create show");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(1); setName(""); setSnapId(""); setCategory(""); setLanguage(""); setCadence("daily");
    setPcloudPath(""); setTargetViews(undefined); setStartDate(undefined); setDescription("");
    setPrimaryLead(""); setBackupLead(""); setSelectedResearchers([]); setSelectedEditors([]);
    setRotationMode("round_robin"); setCaptionTemplate(""); setQaLeadId(""); setQaReviewers([]);
    setCriteria({ pacing: true, captions: true, audio: true, thumbnail: true, branding: true });
    setMinPass(7); setMaxRevisions(3); setAutoEscalate(true); setSlackChannel("");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-2">
          <SheetTitle className="font-display">New Show</SheetTitle>
          <SheetDescription>Set up a new production show in 5 steps.</SheetDescription>
        </SheetHeader>

        <StepIndicator current={step} total={5} />

        {/* ═══════ STEP 1 — Show Profile ═══════ */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Show Profile</h3>
            <div className="space-y-1.5"><Label>Show Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Digest" /></div>
            <div className="space-y-1.5"><Label>Snapchat Profile ID *</Label><Input value={snapId} onChange={e => setSnapId(e.target.value)} placeholder="snap_profile_id" className="font-mono" /></div>
            <div className="space-y-1.5"><Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["News", "Entertainment", "Lifestyle", "Sports", "Tech", "Culture", "Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Language *</Label>
              <Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["English", "Urdu", "Arabic", "Other"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Episode Cadence</Label>
              <RadioGroup value={cadence} onValueChange={setCadence} className="flex gap-4">
                {[{ v: "daily", l: "Daily" }, { v: "3x_week", l: "3x / week" }, { v: "weekly", l: "Weekly" }].map(o => (
                  <div key={o.v} className="flex items-center gap-2"><RadioGroupItem value={o.v} id={`cad-${o.v}`} /><Label htmlFor={`cad-${o.v}`} className="text-sm font-normal cursor-pointer">{o.l}</Label></div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1.5"><Label>pCloud Folder Path</Label><Input value={pcloudPath} onChange={e => setPcloudPath(e.target.value)} placeholder="/shows/show-name/" /></div>
            <div className="space-y-1.5"><Label>Target Views per Episode</Label><Input type="number" min={0} value={targetViews ?? ""} onChange={e => setTargetViews(e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 500000" /></div>
            <div className="space-y-1.5"><Label>Start Date</Label>
              <Popover><PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief show description…" rows={3} /></div>
          </div>
        )}

        {/* ═══════ STEP 2 — Team Lead ═══════ */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Assign Team Lead</h3>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Search team leads…" className="pl-9" /></div>
            <div className="max-h-64 overflow-y-auto space-y-1 rounded border p-1">
              {filteredLeads.map(l => (
                <button key={l.id} onClick={() => setPrimaryLead(l.id)}
                  className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted", primaryLead === l.id && "bg-primary/10 ring-1 ring-primary")}>
                  <Initials name={l.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{l.name}</p>
                    {l.email && <p className="text-xs text-muted-foreground truncate">{l.email}</p>}
                  </div>
                  {l.currentShows !== undefined && <Badge variant="outline" className="text-[10px]">{l.currentShows} shows</Badge>}
                  {primaryLead === l.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              ))}
              {filteredLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No team leads found.</p>}
            </div>
            <div className="space-y-1.5"><Label>Backup Lead (optional)</Label>
              <Select value={backupLead} onValueChange={setBackupLead}><SelectTrigger><SelectValue placeholder="Select backup" /></SelectTrigger>
                <SelectContent>{leads.filter(l => l.id !== primaryLead).map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* ═══════ STEP 3 — Researchers ═══════ */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Assign Researchers</h3>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={researcherSearch} onChange={e => setResearcherSearch(e.target.value)} placeholder="Search researchers…" className="pl-9" /></div>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded border p-1">
              {filteredResearchers.map(r => {
                const sel = selectedResearchers.find(s => s.id === r.id);
                return (
                  <button key={r.id} onClick={() => toggleResearcher(r.id)}
                    className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted", sel && "bg-primary/10 ring-1 ring-primary")}>
                    <Initials name={r.name} />
                    <span className="flex-1 font-medium truncate">{r.name}</span>
                    {r.workload !== undefined && <Badge variant="outline" className="text-[10px]">{r.workload} eps</Badge>}
                    {sel && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            {selectedResearchers.length > 0 && (
              <div className="space-y-3 rounded border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected</p>
                {selectedResearchers.map(sr => {
                  const person = allResearchers.find(r => r.id === sr.id);
                  return (
                    <div key={sr.id} className="flex items-center gap-3">
                      <span className="text-sm flex-1 truncate">{person?.name}</span>
                      <Select value={sr.tag} onValueChange={v => updateResearcher(sr.id, "tag", v)}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="backup">Backup</SelectItem></SelectContent>
                      </Select>
                      <Input type="number" min={1} max={20} value={sr.quota} onChange={e => updateResearcher(sr.id, "quota", Number(e.target.value))} className="h-7 w-16 text-xs" />
                      <span className="text-[10px] text-muted-foreground">eps/wk</span>
                      <button onClick={() => toggleResearcher(sr.id)}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════ STEP 4 — Editors ═══════ */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Assign Editors</h3>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={editorSearch} onChange={e => setEditorSearch(e.target.value)} placeholder="Search editors…" className="pl-9" /></div>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded border p-1">
              {filteredEditors.map(e => {
                const sel = selectedEditors.includes(e.id);
                return (
                  <button key={e.id} onClick={() => toggleEditor(e.id)}
                    className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted", sel && "bg-primary/10 ring-1 ring-primary")}>
                    <Initials name={e.name} />
                    <span className="flex-1 font-medium truncate">{e.name}</span>
                    {e.workload !== undefined && <Badge variant="outline" className="text-[10px]">{e.workload} eps</Badge>}
                    {sel && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <div><p className="text-sm font-medium">Rotation Mode</p><p className="text-xs text-muted-foreground">How episodes are assigned to editors</p></div>
              <Select value={rotationMode} onValueChange={v => setRotationMode(v as "round_robin" | "manual")}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="round_robin">Round-robin</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Style Guide</Label><Input type="file" accept=".pdf,.doc,.docx" /></div>
            <div className="space-y-1.5"><Label>Caption Template</Label><Input value={captionTemplate} onChange={e => setCaptionTemplate(e.target.value)} placeholder="e.g. [Show] S01E{n} — {title}" /></div>
          </div>
        )}

        {/* ═══════ STEP 5 — QA Setup ═══════ */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">QA Setup</h3>
            <div className="space-y-1.5"><Label>QA Lead *</Label>
              <Select value={qaLeadId} onValueChange={setQaLeadId}><SelectTrigger><SelectValue placeholder="Select QA lead" /></SelectTrigger>
                <SelectContent>{allQa.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Additional Reviewers</Label>
              <div className="max-h-36 overflow-y-auto space-y-1 rounded border p-1">
                {allQa.filter(q => q.id !== qaLeadId).map(q => {
                  const sel = qaReviewers.includes(q.id);
                  return (
                    <button key={q.id} onClick={() => toggleQaReviewer(q.id)}
                      className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted", sel && "bg-primary/10 ring-1 ring-primary")}>
                      <Initials name={q.name} /><span className="flex-1 truncate">{q.name}</span>{sel && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3 rounded border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating Criteria</p>
              {(Object.keys(criteria) as (keyof typeof criteria)[]).map(k => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="text-sm capitalize font-normal">{k}</Label>
                  <Switch checked={criteria[k]} onCheckedChange={v => setCriteria(p => ({ ...p, [k]: v }))} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Min Pass Score: {minPass}/10</Label>
              <Slider min={1} max={10} step={1} value={[minPass]} onValueChange={([v]) => setMinPass(v)} />
            </div>
            <div className="space-y-1.5"><Label>Max Revision Rounds</Label><Input type="number" min={1} max={20} value={maxRevisions} onChange={e => setMaxRevisions(Number(e.target.value))} /></div>
            <div className="flex items-center justify-between rounded border p-3">
              <div><p className="text-sm font-medium">Auto-escalate</p><p className="text-xs text-muted-foreground">Alert lead after max revisions reached</p></div>
              <Switch checked={autoEscalate} onCheckedChange={setAutoEscalate} />
            </div>
            <div className="space-y-1.5"><Label>Slack Channel for QA Alerts</Label><Input value={slackChannel} onChange={e => setSlackChannel(e.target.value)} placeholder="#show-qa-alerts" /></div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex gap-3 pt-6 mt-4 border-t">
          {step > 1 && <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>Back</Button>}
          {step < 5 ? (
            <Button className="flex-1" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Next</Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={saving || !canNext()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Show
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NewShowSheet;
