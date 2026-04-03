import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setToken, API_BASE } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      setToken(data.token);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted p-12">
        <div className="max-w-md space-y-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary font-display text-2xl font-bold text-primary-foreground">
            SJ
          </div>
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-bold text-foreground">
              Shah Jewna & Co
            </h1>
            <p className="text-lg text-muted-foreground">
              Production management system
            </p>
            <p className="text-sm text-muted-foreground">
              Social Plug Media · Daily Vertex LLC
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary font-display text-xl font-bold text-primary-foreground">
              SJ
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Shah Jewna & Co</h1>
              <p className="text-sm text-muted-foreground mt-1">Production management system</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access SnapHouse
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@shahjewna.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
