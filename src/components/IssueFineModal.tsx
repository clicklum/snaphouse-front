import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

/* ── Types ── */
interface FineReason { id: string; label: string; }
interface EmployeeOption { id: string; name: string; email: string; }

interface IssueFineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled employee — if provided, employee selector is hidden */
  employeeId?: string;
  employeeName?: string;
  onCreated?: () => void;
}

const FALLBACK_REASONS: FineReason[] = [
  { id: "late_delivery", label: "Late delivery" },
  { id: "qa_rejection", label: "QA rejection exceed" },
  { id: "attendance", label: "Attendance violation" },
  { id: "policy_breach", label: "Policy breach" },
  { id: "other", label: "Other" },
];

const currentMonthValue = () => format(new Date(), "yyyy-MM");

const IssueFineModal = ({ open, onOpenChange, employeeId, employeeName, onCreated }: IssueFineModalProps) => {
  /* ── form state ── */
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeId || "");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState(employeeName || "");
  const [empSearch, setEmpSearch] = useState("");
  const [empPopoverOpen, setEmpPopoverOpen] = useState(false);

  const [reasons, setReasons] = useState<FineReason[]>(FALLBACK_REASONS);
  const [reasonId, setReasonId] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [applyMonth, setApplyMonth] = useState(currentMonthValue());
  const [notifySlack, setNotifySlack] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ── employee list for search ── */
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  const needsEmployeeSearch = !employeeId;

  /* fetch reasons */
  useEffect(() => {
    if (!open) return;
    api.get<FineReason[]>("/api/admin/fine-reasons")
      .then(setReasons)
      .catch(() => setReasons(FALLBACK_REASONS));
  }, [open]);

  /* fetch employees when needed */
  useEffect(() => {
    if (!open || !needsEmployeeSearch) return;
    setEmpLoading(true);
    apiFetch<EmployeeOption[]>("/api/employees?fields=id,name,email")
      .then(setEmployees)
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setEmpLoading(false));
  }, [open, needsEmployeeSearch]);

  /* sync pre-filled props */
  useEffect(() => {
    if (open) {
      setSelectedEmployee(employeeId || "");
      setSelectedEmployeeName(employeeName || "");
    }
  }, [open, employeeId, employeeName]);

  /* reset on close */
  const reset = () => {
    setReasonId(""); setOtherReason(""); setAmount(""); setDescription("");
    setApplyMonth(currentMonthValue()); setNotifySlack(true); setEmpSearch("");
    if (!employeeId) { setSelectedEmployee(""); setSelectedEmployeeName(""); }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  /* validation */
  const finalReason = reasonId === "other" ? otherReason.trim() : reasons.find(r => r.id === reasonId)?.label || "";
  const isValid = !!selectedEmployee && !!finalReason && Number(amount) > 0;

  /* month options (current + 2 future) */
  const monthOptions = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  const submit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await apiFetch("/api/fines", {
        method: "POST",
        body: JSON.stringify({
          employeeId: selectedEmployee,
          reason: finalReason,
          reasonId,
          amount: Number(amount),
          description: description.trim() || undefined,
          applyMonth,
          notifySlack,
        }),
      });
      const monthLabel = monthOptions.find(m => m.value === applyMonth)?.label || applyMonth;
      toast.success(`Fine issued · Will be deducted from ${monthLabel} payroll · Employee notified on Slack`);
      handleOpenChange(false);
      onCreated?.();
    } catch {
      toast.error("Failed to issue fine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Fine</DialogTitle>
          <DialogDescription>This will be deducted from the selected month's payroll.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Employee ── */}
          {needsEmployeeSearch ? (
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Popover open={empPopoverOpen} onOpenChange={setEmpPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal text-sm h-9">
                    {selectedEmployeeName || <span className="text-muted-foreground">Select employee…</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email…" value={empSearch} onValueChange={setEmpSearch} />
                    <CommandList>
                      {empLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                      ) : (
                        <>
                          <CommandEmpty>No employees found.</CommandEmpty>
                          <CommandGroup>
                            {employees.map(emp => (
                              <CommandItem
                                key={emp.id}
                                value={`${emp.name} ${emp.email}`}
                                onSelect={() => {
                                  setSelectedEmployee(emp.id);
                                  setSelectedEmployeeName(emp.name);
                                  setEmpPopoverOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{emp.name}</span>
                                  <span className="text-xs text-muted-foreground">{emp.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <p className="text-sm font-medium">{selectedEmployeeName}</p>
            </div>
          )}

          {/* ── Reason ── */}
          <div className="space-y-1.5">
            <Label>Fine Reason</Label>
            <Select value={reasonId} onValueChange={setReasonId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select reason…" /></SelectTrigger>
              <SelectContent>
                {reasons.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {reasonId === "other" && (
              <Input
                placeholder="Specify reason…"
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                className="mt-1.5 h-9"
              />
            )}
          </div>

          {/* ── Amount ── */}
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₨</span>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* ── Description ── */}
          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Additional details…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* ── Apply to month ── */}
          <div className="space-y-1.5">
            <Label>Apply to Month</Label>
            <Select value={applyMonth} onValueChange={setApplyMonth}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ── Slack notify ── */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Notify employee via Slack</p>
              <p className="text-xs text-muted-foreground">Send a Slack DM about this fine</p>
            </div>
            <Switch checked={notifySlack} onCheckedChange={setNotifySlack} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={saving || !isValid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Issue Fine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IssueFineModal;
