import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken, setRole } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ALLOWED_DOMAINS = ["dailyvertex.io", "socialplug.media"];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [domainError, setDomainError] = useState("");
  const navigate = useNavigate();

  const validateDomain = (value: string) => {
    if (!value.includes("@")) { setDomainError(""); return; }
    const domain = value.split("@")[1]?.toLowerCase();
    if (domain && !ALLOWED_DOMAINS.includes(domain)) {
      setDomainError("This email domain is not authorised. Use @dailyvertex.io or @socialplug.media only.");
    } else {
      setDomainError("");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    validateDomain(e.target.value);
  };

  const isDisabled = loading || !email || !password || !!domainError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (domainError) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { toast.error("Invalid email or password"); return; }
      if (res.status === 403) { toast.error("Access denied. Use Slack login instead."); return; }
      if (!res.ok) throw new Error(data.message || "Login failed");
      setToken(data.token);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ===== LEFT PANEL ===== */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-muted p-12">
        <div className="max-w-sm space-y-8 text-center">
          {/* Logo */}
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl font-display text-3xl font-bold text-white"
            style={{ backgroundColor: "#378ADD" }}
          >
            SJ
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold text-foreground">Shah Jewna &amp; Co</h1>
            <p className="text-lg text-muted-foreground">Production management system</p>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you a team member?</p>
            <a
              href="/auth/slack"
              className="inline-flex h-11 items-center justify-center gap-2.5 rounded-md px-6 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#4A154B" }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
              </svg>
              Sign in with Slack
            </a>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile branding */}
          <div className="lg:hidden space-y-4 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl font-display text-xl font-bold text-white"
              style={{ backgroundColor: "#378ADD" }}
            >
              SJ
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Shah Jewna &amp; Co</h1>
              <p className="text-sm text-muted-foreground mt-1">Production management system</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Are you a team member?</p>
              <a
                href="/auth/slack"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#4A154B" }}
              >
                Sign in with Slack
              </a>
            </div>
            <Separator />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground">Management sign in</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@dailyvertex.io"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => validateDomain(email)}
                required
                className="h-11"
              />
              {domainError && (
                <p className="text-xs text-destructive font-medium">{domainError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
            <Button type="submit" className="w-full h-11" disabled={isDisabled}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Admins · Accountant · Team leads · Floor managers only
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
