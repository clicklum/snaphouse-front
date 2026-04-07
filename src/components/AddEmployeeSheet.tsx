import { useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const roles = [
  "Admin",
  "Floor Manager",
  "Team Lead",
  "Researcher",
  "Editor",
  "QA",
  "Uploader",
] as const;

const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  role: z.enum(roles, { required_error: "Role is required" }),
  department: z.string().trim().min(1, "Department is required").max(100),
  baseSalary: z.coerce.number().min(0, "Must be positive"),
  joinDate: z.date({ required_error: "Join date is required" }),
  phone: z.string().trim().max(20).optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

interface AddEmployeeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const emptyForm: EmployeeForm = {
  name: "",
  email: "",
  role: "Editor",
  department: "",
  baseSalary: 0,
  joinDate: new Date(),
  phone: "",
};

const AddEmployeeSheet = ({ open, onOpenChange, onCreated }: AddEmployeeSheetProps) => {
  const [form, setForm] = useState<EmployeeForm>({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const update = (field: keyof EmployeeForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const n = { ...prev };
      delete n[field];
      return n;
    });
  };

  const handleSave = async () => {
    const result = employeeSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const k = e.path[0]?.toString();
        if (k) fe[k] = e.message;
      });
      setErrors(fe);
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/employees", {
        method: "POST",
        body: JSON.stringify({
          ...result.data,
          joinDate: result.data.joinDate.toISOString().slice(0, 10),
        }),
      });
      toast.success("Employee added");
      onOpenChange(false);
      setForm({ ...emptyForm });
      setErrors({});
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">Add Employee</SheetTitle>
          <SheetDescription>Fill in the details below.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ahmed Khan" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="ahmed@shahjewna.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={form.role} onValueChange={(v) => update("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Department *</Label>
            <Input value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="e.g. Production" />
            {errors.department && <p className="text-xs text-destructive">{errors.department}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Base Salary (PKR) *</Label>
            <Input type="number" min={0} value={form.baseSalary || ""} onChange={(e) => update("baseSalary", e.target.value ? Number(e.target.value) : 0)} placeholder="50000" />
            {errors.baseSalary && <p className="text-xs text-destructive">{errors.baseSalary}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Join Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.joinDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.joinDate ? format(form.joinDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={form.joinDate} onSelect={(d) => d && update("joinDate", d)} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {errors.joinDate && <p className="text-xs text-destructive">{errors.joinDate}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+92 300 1234567" />
          </div>
        </div>

        <div className="flex gap-3 pt-8">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Add Employee"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddEmployeeSheet;
