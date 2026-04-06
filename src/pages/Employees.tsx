import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableSkeleton } from "@/components/PageSkeletons";
import { EmployeesEmpty, PageError } from "@/components/PageStates";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, User, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import AddEmployeeSheet from "@/components/AddEmployeeSheet";
import IssueFineModal from "@/components/IssueFineModal";

interface Employee {
  id: string; name: string; email: string; role: string;
  assignedShows: number; monthOutput: number; fines: number;
  status: "active" | "inactive";
}

const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
const roleBadgeVariant = (role: string) => {
  const r = role.toLowerCase();
  if (r === "admin") return "default" as const;
  if (r === "team lead" || r === "floor manager") return "secondary" as const;
  return "outline" as const;
};
const allRoles = ["All Roles", "Admin", "Floor Manager", "Team Lead", "Researcher", "Editor", "QA", "Uploader"];

const Employees = () => {
  const navigate = useNavigate();
  const role = getRole();
  const isMobile = useIsMobile();
  const canFine = ["admin", "floor_manager"].includes(role);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fineOpen, setFineOpen] = useState(false);
  const [fineTarget, setFineTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchEmployees = () => {
    setLoading(true); setError(null);
    apiFetch<Employee[]>("/api/employees")
      .then(setEmployees)
      .catch((e) => setError(e.message || "Failed to load employees"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchEmployees(); }, []);

  const filtered = useMemo(() => {
    let list = employees;
    if (roleFilter !== "All Roles") list = list.filter((e) => e.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
    }
    return list;
  }, [employees, search, roleFilter]);

  const openFineModal = (emp: Employee) => { setFineTarget({ id: emp.id, name: emp.name }); setFineOpen(true); };
  const handleDeactivate = async (id: string) => {
    try { await apiFetch(`/api/employees/${id}/deactivate`, { method: "PATCH" }); toast.success("Employee deactivated"); fetchEmployees(); }
    catch (err: any) { toast.error(err.message || "Failed to deactivate"); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team members and roles</p>
        </div>
        <Button onClick={() => setSheetOpen(true)} size={isMobile ? "sm" : "default"}>
          <Plus className="h-4 w-4 mr-2" />Add Employee
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{allRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {error ? (
        <PageError message={error} onRetry={fetchEmployees} />
      ) : loading ? (
        <Card className="border-border"><CardContent className="p-4"><TableSkeleton rows={6} cols={5} /></CardContent></Card>
      ) : filtered.length === 0 ? (
        employees.length === 0 ? <EmployeesEmpty /> : (
          <div className="p-12 text-center text-sm text-muted-foreground">No employees match your filters.</div>
        )
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((emp) => (
            <Card key={emp.id} className="border-border cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/employees/${emp.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground font-medium">{getInitials(emp.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                  </div>
                  <Badge variant={roleBadgeVariant(emp.role)} className="shrink-0">{emp.role}</Badge>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>{emp.assignedShows} shows</span>
                  <span>{emp.monthOutput} output</span>
                  <Badge variant={emp.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">{emp.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium px-6 py-3">Employee</th>
                    <th className="text-left font-medium px-4 py-3">Role</th>
                    <th className="text-right font-medium px-4 py-3">Shows</th>
                    <th className="text-right font-medium px-4 py-3">Output</th>
                    <th className="text-right font-medium px-4 py-3">Fines</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-right font-medium px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-secondary text-secondary-foreground font-medium">{getInitials(emp.name)}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <button onClick={() => navigate(`/employees/${emp.id}`)} className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left truncate block">{emp.name}</button>
                            <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><Badge variant={roleBadgeVariant(emp.role)}>{emp.role}</Badge></td>
                      <td className="px-4 py-4 text-right text-muted-foreground">{emp.assignedShows}</td>
                      <td className="px-4 py-4 text-right text-muted-foreground">{emp.monthOutput}</td>
                      <td className={`px-4 py-4 text-right font-medium ${emp.fines > 0 ? "text-destructive" : "text-muted-foreground"}`}>{emp.fines > 0 ? `₨ ${emp.fines.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-4"><Badge variant={emp.status === "active" ? "default" : "secondary"} className="capitalize">{emp.status}</Badge></td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/employees/${emp.id}`)}><User className="h-4 w-4 mr-2" />View Profile</DropdownMenuItem>
                            {canFine && <DropdownMenuItem onClick={() => openFineModal(emp)}><AlertTriangle className="h-4 w-4 mr-2" />Issue Fine</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => handleDeactivate(emp.id)} className="text-destructive focus:text-destructive"><XCircle className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <AddEmployeeSheet open={sheetOpen} onOpenChange={setSheetOpen} onCreated={fetchEmployees} />
      <IssueFineModal open={fineOpen} onOpenChange={setFineOpen} employeeId={fineTarget?.id} employeeName={fineTarget?.name} onCreated={fetchEmployees} />
    </div>
  );
};

export default Employees;
