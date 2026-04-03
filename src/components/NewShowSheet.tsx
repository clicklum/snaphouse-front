import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const showSchema = z.object({
  name: z.string().trim().min(1, "Show name is required").max(150),
  snapchatProfileId: z.string().trim().max(100).optional(),
  category: z.string().min(1, "Category is required"),
  language: z.string().trim().min(1, "Language is required").max(50),
  cadence: z.enum(["daily", "3x_week", "weekly"]),
  pcloudFolderPath: z.string().trim().max(500).optional(),
  targetViews: z.coerce.number().int().min(0).optional(),
  status: z.enum(["active", "paused", "archived"]),
});

type ShowFormData = z.infer<typeof showSchema>;

const categories = [
  "Entertainment",
  "News",
  "Sports",
  "Lifestyle",
  "Comedy",
  "Drama",
  "Documentary",
  "Reality",
  "Education",
  "Other",
];

const cadenceLabels: Record<string, string> = {
  daily: "Daily",
  "3x_week": "3x / Week",
  weekly: "Weekly",
};

interface NewShowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const NewShowSheet = ({ open, onOpenChange, onCreated }: NewShowSheetProps) => {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<ShowFormData>({
    name: "",
    snapchatProfileId: "",
    category: "",
    language: "",
    cadence: "daily",
    pcloudFolderPath: "",
    targetViews: undefined,
    status: "active",
  });

  const update = (field: keyof ShowFormData, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSave = async () => {
    const result = showSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const key = e.path[0]?.toString();
        if (key) fieldErrors[key] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/shows", {
        method: "POST",
        body: JSON.stringify(result.data),
      });
      toast.success("Show created successfully");
      onOpenChange(false);
      setForm({
        name: "",
        snapchatProfileId: "",
        category: "",
        language: "",
        cadence: "daily",
        pcloudFolderPath: "",
        targetViews: undefined,
        status: "active",
      });
      setErrors({});
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Failed to create show");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">New Show</SheetTitle>
          <SheetDescription>Add a new show to the pipeline.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Show Name */}
          <div className="space-y-1.5">
            <Label htmlFor="show-name">Show Name *</Label>
            <Input
              id="show-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Daily Digest"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Snapchat Profile ID */}
          <div className="space-y-1.5">
            <Label htmlFor="snap-id">Snapchat Profile ID</Label>
            <Input
              id="snap-id"
              value={form.snapchatProfileId}
              onChange={(e) => update("snapchatProfileId", e.target.value)}
              placeholder="Profile ID"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c.toLowerCase()}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label htmlFor="language">Language *</Label>
            <Input
              id="language"
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
              placeholder="e.g. Urdu, English"
            />
            {errors.language && <p className="text-xs text-destructive">{errors.language}</p>}
          </div>

          {/* Cadence */}
          <div className="space-y-1.5">
            <Label>Episode Cadence</Label>
            <Select value={form.cadence} onValueChange={(v) => update("cadence", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(cadenceLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* pCloud Folder Path */}
          <div className="space-y-1.5">
            <Label htmlFor="pcloud">pCloud Folder Path</Label>
            <Input
              id="pcloud"
              value={form.pcloudFolderPath}
              onChange={(e) => update("pcloudFolderPath", e.target.value)}
              placeholder="/Shows/DailyDigest"
            />
          </div>

          {/* Target Views */}
          <div className="space-y-1.5">
            <Label htmlFor="target-views">Target Views</Label>
            <Input
              id="target-views"
              type="number"
              min={0}
              value={form.targetViews ?? ""}
              onChange={(e) =>
                update("targetViews", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="e.g. 500000"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-8">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Create Show"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NewShowSheet;
