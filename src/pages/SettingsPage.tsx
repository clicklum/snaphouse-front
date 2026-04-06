import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Settings, Upload, Plug, Shield, ListChecks, ScrollText, Loader2,
  Plus, Pencil, Trash2, CheckCircle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/* ---------- types ---------- */
interface GeneralSettings {
  companyName: string;
  logoUrl: string;
  brandColor: string;
}

interface IntegrationSettings {
  snapchatApiToken: string;
  pcloudConnected: boolean;
  slackWebhookUrl: string;
}

interface RolePermission {
  role: string;
  permissions: Record<string, boolean>;
}

interface FineReason {
  id: string;
  reason: string;
  defaultAmount: number;
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  ip: string;
}

interface AdminSettings {
  general: GeneralSettings;
  integrations: IntegrationSettings;
  roles: RolePermission[];
  fineReasons: FineReason[];
  auditLog: AuditEntry[];
  permissionKeys: string[];
}

const SectionSkeleton = () => (
  <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
);

/* ========== Component ========== */
const SettingsPage = () => {
  const [data, setData] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* local editable state */
  const [general, setGeneral] = useState<GeneralSettings>({ companyName: "", logoUrl: "", brandColor: "#D97706" });
  const [integrations, setIntegrations] = useState<IntegrationSettings>({ snapchatApiToken: "", pcloudConnected: false, slackWebhookUrl: "" });
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [fineReasons, setFineReasons] = useState<FineReason[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);

  /* fine reason dialog */
  const [fineDialog, setFineDialog] = useState<{ open: boolean; editing: FineReason | null }>({ open: false, editing: null });
  const [fineForm, setFineForm] = useState({ reason: "", defaultAmount: 0 });

  /* snapchat test */
  const [testing, setTesting] = useState(false);

  const fetchSettings = () => {
    setLoading(true);
    apiFetch<AdminSettings>("/api/admin/settings")
      .then((d) => {
        setData(d);
        setGeneral(d.general);
        setIntegrations(d.integrations);
        setRoles(d.roles);
        setFineReasons(d.fineReasons);
        setAuditLog(d.auditLog);
        setPermissionKeys(d.permissionKeys || []);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async (section: string, payload: unknown) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ section, data: payload }) });
      toast.success("Settings saved");
      fetchSettings();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  /* ---------- Snapchat test ---------- */
  const testSnapchat = async () => {
    setTesting(true);
    try {
      await apiFetch("/api/admin/settings/test-snapchat", { method: "POST", body: JSON.stringify({ token: integrations.snapchatApiToken }) });
      toast.success("Snapchat connection OK");
    } catch { toast.error("Snapchat connection failed"); }
    finally { setTesting(false); }
  };

  /* ---------- pCloud ---------- */
  const connectPcloud = () => {
    window.open(`${import.meta.env.VITE_API_BASE || "https://api.dailyvertex.io"}/api/admin/pcloud/oauth`, "_blank");
  };

  /* ---------- Roles toggle ---------- */
  const togglePerm = (roleIdx: number, perm: string) => {
    setRoles((prev) => prev.map((r, i) => i === roleIdx ? { ...r, permissions: { ...r.permissions, [perm]: !r.permissions[perm] } } : r));
  };

  /* ---------- Fine reasons CRUD ---------- */
  const openFineDialog = (fr?: FineReason) => {
    setFineForm(fr ? { reason: fr.reason, defaultAmount: fr.defaultAmount } : { reason: "", defaultAmount: 0 });
    setFineDialog({ open: true, editing: fr || null });
  };

  const saveFineReason = () => {
    if (!fineForm.reason.trim()) { toast.error("Reason is required"); return; }
    if (fineDialog.editing) {
      setFineReasons((prev) => prev.map((f) => f.id === fineDialog.editing!.id ? { ...f, ...fineForm } : f));
    } else {
      setFineReasons((prev) => [...prev, { id: crypto.randomUUID(), ...fineForm }]);
    }
    setFineDialog({ open: false, editing: null });
  };

  const deleteFineReason = (id: string) => {
    setFineReasons((prev) => prev.filter((f) => f.id !== id));
  };

  /* ---------- Logo upload ---------- */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setGeneral((g) => ({ ...g, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const currency = (v: number) => `PKR ${v.toLocaleString()}`;

  if (loading) return (
    <div className="space-y-6">
      <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
      <SectionSkeleton />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" />Admin Settings</h1>
        <p className="text-sm text-muted-foreground">Manage company configuration, integrations, and permissions.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general" className="gap-1"><Upload className="h-3.5 w-3.5" />General</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1"><Plug className="h-3.5 w-3.5" />Integrations</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1"><Shield className="h-3.5 w-3.5" />Roles</TabsTrigger>
          <TabsTrigger value="fines" className="gap-1"><ListChecks className="h-3.5 w-3.5" />Fine Reasons</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1"><ScrollText className="h-3.5 w-3.5" />Audit Log</TabsTrigger>
        </TabsList>

        {/* ===== GENERAL ===== */}
        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>General</CardTitle><CardDescription>Company branding and identity.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={general.companyName} onChange={(e) => setGeneral((g) => ({ ...g, companyName: e.target.value }))} placeholder="Shah Jewna & Co." />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {general.logoUrl && <img src={general.logoUrl} alt="Logo" className="h-12 w-12 rounded-md border object-contain" />}
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Branding Colour</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={general.brandColor} onChange={(e) => setGeneral((g) => ({ ...g, brandColor: e.target.value }))} className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent" />
                  <Input value={general.brandColor} onChange={(e) => setGeneral((g) => ({ ...g, brandColor: e.target.value }))} className="max-w-[140px] font-mono text-sm" />
                </div>
              </div>
              <Button onClick={() => save("general", general)} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save General</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== INTEGRATIONS ===== */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader><CardTitle>Integrations</CardTitle><CardDescription>Connect external services.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {/* Snapchat */}
              <div className="space-y-2">
                <Label>Snapchat API Token</Label>
                <div className="flex gap-2">
                  <Input type="password" value={integrations.snapchatApiToken} onChange={(e) => setIntegrations((i) => ({ ...i, snapchatApiToken: e.target.value }))} placeholder="Enter token…" className="flex-1" />
                  <Button variant="outline" onClick={testSnapchat} disabled={testing}>
                    {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}Test
                  </Button>
                </div>
              </div>
              {/* pCloud */}
              <div className="space-y-2">
                <Label>pCloud</Label>
                <div className="flex items-center gap-3">
                  <Badge variant={integrations.pcloudConnected ? "default" : "secondary"}>{integrations.pcloudConnected ? "Connected" : "Not connected"}</Badge>
                  <Button variant="outline" onClick={connectPcloud}>Connect pCloud</Button>
                </div>
              </div>
              {/* Slack */}
              <div className="space-y-2">
                <Label>Slack Webhook URL</Label>
                <Input value={integrations.slackWebhookUrl} onChange={(e) => setIntegrations((i) => ({ ...i, slackWebhookUrl: e.target.value }))} placeholder="https://hooks.slack.com/services/…" />
              </div>
              <Button onClick={() => save("integrations", integrations)} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Integrations</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ROLES ===== */}
        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle>Roles &amp; Permissions</CardTitle><CardDescription>Toggle permissions per role.</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Role</TableHead>
                      {permissionKeys.map((p) => <TableHead key={p} className="text-center capitalize text-xs">{p.replace(/_/g, " ")}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((r, ri) => (
                      <TableRow key={r.role}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">{r.role}</TableCell>
                        {permissionKeys.map((p) => (
                          <TableCell key={p} className="text-center">
                            <Switch checked={!!r.permissions[p]} onCheckedChange={() => togglePerm(ri, p)} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button className="mt-4" onClick={() => save("roles", roles)} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Permissions</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FINE REASONS ===== */}
        <TabsContent value="fines">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Fine Reasons Library</CardTitle><CardDescription>Preset reasons for issuing fines.</CardDescription></div>
              <Button size="sm" onClick={() => openFineDialog()}><Plus className="mr-1 h-4 w-4" />Add Reason</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Default Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fineReasons.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No fine reasons configured.</TableCell></TableRow>
                  )}
                  {fineReasons.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.reason}</TableCell>
                      <TableCell className="text-right font-medium">{currency(f.defaultAmount)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openFineDialog(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteFineReason(f.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4" onClick={() => save("fineReasons", fineReasons)} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Fine Reasons</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AUDIT LOG ===== */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Audit Log</CardTitle><CardDescription>Read-only activity log.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit entries.</TableCell></TableRow>
                  )}
                  {auditLog.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.action}</TableCell>
                      <TableCell>{e.user}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{e.timestamp}</TableCell>
                      <TableCell className="font-mono text-xs">{e.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fine Reason Dialog */}
      <Dialog open={fineDialog.open} onOpenChange={(o) => !o && setFineDialog({ open: false, editing: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{fineDialog.editing ? "Edit" : "Add"} Fine Reason</DialogTitle>
            <DialogDescription>Define a preset fine reason and default amount.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={fineForm.reason} onChange={(e) => setFineForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Late submission" />
            </div>
            <div className="space-y-2">
              <Label>Default Amount (PKR)</Label>
              <Input type="number" value={fineForm.defaultAmount} onChange={(e) => setFineForm((f) => ({ ...f, defaultAmount: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveFineReason}>{fineDialog.editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
