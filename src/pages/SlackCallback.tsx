import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { setToken } from "@/lib/auth";
import { API_ORIGIN } from "@/lib/api";
import { Loader2, XCircle, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallbackState =
  | { status: "loading" }
  | { status: "blocked" }
  | { status: "welcome"; name: string; email: string }
  | { status: "error"; message: string };

const SlackCallback = () => {
  const [state, setState] = useState<CallbackState>({ status: "loading" });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setState({ status: "error", message: "Missing authorization code." });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/slack/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 403 && data.reason === "not_in_workspace") {
          setState({ status: "blocked" });
          return;
        }

        if (!res.ok) {
          setState({ status: "error", message: data.message || "Authentication failed." });
          return;
        }

        // Save auth data
        if (data.token) setToken(data.token);
        if (data.name) localStorage.setItem("snaphouse_user_name", data.name);
        if (data.email) localStorage.setItem("snaphouse_user_email", data.email);
        if (data.role) localStorage.setItem("snaphouse_user_role", data.role);

        if (data.is_new_user) {
          setState({ status: "welcome", name: data.name || "there", email: data.email || "" });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        setState({ status: "error", message: "Network error. Please try again." });
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-muted p-12">
        <div className="max-w-sm space-y-8 text-center">
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
        </div>
      </div>

      {/* Right panel — state */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* LOADING */}
          {state.status === "loading" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground">Signing you in…</h2>
              <p className="text-sm text-muted-foreground">Verifying your Slack account</p>
            </div>
          )}

          {/* BLOCKED */}
          {state.status === "blocked" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-foreground">Access denied</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your Slack account is not part of the <span className="font-semibold">dailyvertexcom.slack.com</span> workspace, or your access has not been approved.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Contact your manager at{" "}
                <a href="mailto:haris@dailyvertex.io" className="text-primary font-medium hover:underline underline-offset-2">
                  haris@dailyvertex.io
                </a>
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          )}

          {/* WELCOME */}
          {state.status === "welcome" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-foreground">Welcome, {state.name}</h2>
                <p className="text-sm text-muted-foreground">{state.email}</p>
                <p className="text-xs text-muted-foreground">
                  Account created from Slack · Role will be assigned by your manager
                </p>
              </div>
              <div className="flex w-full gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-left">
                <Info className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
                <p className="text-sm text-blue-200/90">
                  Your account is set up. You will receive a Slack message once your manager assigns your role.
                </p>
              </div>
              <Button className="w-full" asChild>
                <Link to="/dashboard">Go to my dashboard</Link>
              </Button>
            </div>
          )}

          {/* ERROR */}
          {state.status === "error" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-foreground">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">{state.message}</p>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlackCallback;
