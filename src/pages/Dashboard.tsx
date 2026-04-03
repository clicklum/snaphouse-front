import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, ListTodo, Users, Wallet } from "lucide-react";

const stats = [
  { label: "Active Shows", value: "12", icon: Film, change: "+2 this month" },
  { label: "Pending Tasks", value: "34", icon: ListTodo, change: "8 overdue" },
  { label: "Employees", value: "86", icon: Users, change: "3 on leave" },
  { label: "Monthly Payroll", value: "₨ 2.4M", icon: Wallet, change: "Due in 5 days" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back to SnapHouse</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Activity feed will appear here once connected to the API.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
