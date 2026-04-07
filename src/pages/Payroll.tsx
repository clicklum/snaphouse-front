import { useState, useEffect } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, DollarSign, Users, AlertTriangle, TrendingUp, FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  attendanceDays: number;
  totalDays: number;
  fines: number;
  fineDetails: { reason: string; date: string; issuedBy: string; amount: number }[];
  bonus: number;
  netPay: number;
  paid: boolean;
}

interface PayrollSummary {
  totalGross: number;
  totalFines: number;
  totalNet: number;
  employeeCount: number;
  entries: PayrollEntry[];
}

const currency = (v: number) => `PKR ${v.toLocaleString()}`;

const StatSkeleton = () => (
  <Card><CardContent className="p-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /></CardContent></Card>
);
const TableSkeleton = () => (
  <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
);

const Payroll = () => {
  const [month, setMonth] = useState(new Date());
  const [data, setData] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [fineModal, setFineModal] = useState<PayrollEntry | null>(null);
  const [payslipModal, setPayslipModal] = useState<PayrollEntry | null>(null);

  const monthStr = format(month, "yyyy-MM");

  const fetchData = () => {
    setLoading(true);
    api.get<PayrollSummary>(`/api/payroll?month=${monthStr}`)
      .then(setData)
      .catch(() => toast.error("Failed to load payroll"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [monthStr]);

  const runPayroll = async () => {
    setRunning(true);
    try {
      await api.post("/api/payroll/run", { month: monthStr });
      toast.success("Payroll processed");
      fetchData();
    } catch { toast.error("Failed to run payroll"); }
    finally { setRunning(false); }
  };

  const exportPdf = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/payroll/export?month=${monthStr}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-${monthStr}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  };

  const viewPayslip = async (entry: PayrollEntry) => {
    setPayslipModal(entry);
  };

  const stats = [
    { label: "Total Gross", value: data ? currency(data.totalGross) : "—", icon: DollarSign, color: "text-primary" },
    { label: "Total Fines", value: data ? currency(data.totalFines) : "—", icon: AlertTriangle, color: "text-destructive" },
    { label: "Total Net", value: data ? currency(data.totalNet) : "—", icon: TrendingUp, color: "text-green-500" },
    { label: "Employees", value: data ? data.employeeCount.toString() : "—", icon: Users, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Process salaries, deductions, and payslips.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[120px] text-center font-medium">{format(month, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={runPayroll} disabled={running}><DollarSign className="mr-2 h-4 w-4" />{running ? "Processing…" : "Run Payroll"}</Button>
        <Button variant="outline" onClick={exportPdf}><Download className="mr-2 h-4 w-4" />Export PDF</Button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton /> : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
                <TableHead className="text-right">Fines</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.entries.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No payroll data for this month.</TableCell></TableRow>
              )}
              {data?.entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.employeeName}</TableCell>
                  <TableCell className="text-right">{currency(e.baseSalary)}</TableCell>
                  <TableCell className="text-center">{e.attendanceDays}/{e.totalDays}</TableCell>
                  <TableCell className="text-right">
                    {e.fines > 0 ? (
                      <button onClick={() => setFineModal(e)} className="text-destructive font-semibold underline-offset-2 hover:underline">
                        {currency(e.fines)}
                      </button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.bonus > 0 ? <span className="text-green-500 font-semibold">{currency(e.bonus)}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-bold">{currency(e.netPay)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={e.paid ? "default" : "secondary"}>{e.paid ? "Paid" : "Pending"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => viewPayslip(e)}><Eye className="mr-1 h-3 w-3" />Payslip</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Fine Detail Modal */}
      <Dialog open={!!fineModal} onOpenChange={() => setFineModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fine Details — {fineModal?.employeeName}</DialogTitle>
            <DialogDescription>Breakdown of fines for {format(month, "MMMM yyyy")}.</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Issued By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fineModal?.fineDetails.map((f, i) => (
                <TableRow key={i}>
                  <TableCell>{f.reason}</TableCell>
                  <TableCell>{f.date}</TableCell>
                  <TableCell>{f.issuedBy}</TableCell>
                  <TableCell className="text-right text-destructive font-semibold">{currency(f.amount)}</TableCell>
                </TableRow>
              ))}
              {(!fineModal?.fineDetails || fineModal.fineDetails.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No fine records.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Payslip Modal */}
      <Dialog open={!!payslipModal} onOpenChange={() => setPayslipModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Payslip</DialogTitle>
            <DialogDescription>{payslipModal?.employeeName} — {format(month, "MMMM yyyy")}</DialogDescription>
          </DialogHeader>
          {payslipModal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-muted-foreground">Base Salary</div><div className="text-right font-medium">{currency(payslipModal.baseSalary)}</div>
                <div className="text-muted-foreground">Attendance</div><div className="text-right font-medium">{payslipModal.attendanceDays}/{payslipModal.totalDays} days</div>
                <div className="text-muted-foreground">Bonus</div><div className="text-right font-medium text-green-500">{currency(payslipModal.bonus)}</div>
                <div className="text-muted-foreground">Fines</div><div className="text-right font-medium text-destructive">-{currency(payslipModal.fines)}</div>
                <div className="border-t pt-2 font-semibold">Net Pay</div><div className="border-t pt-2 text-right text-lg font-bold">{currency(payslipModal.netPay)}</div>
              </div>
              <div className="text-center">
                <Badge variant={payslipModal.paid ? "default" : "secondary"} className="text-sm">{payslipModal.paid ? "Paid" : "Pending"}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
