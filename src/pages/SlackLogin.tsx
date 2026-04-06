import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Link } from "react-router-dom";

const SlackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
  </svg>
);

const SlackLogin = () => (
  <div className="min-h-screen flex bg-background">
    {/* ===== LEFT PANEL ===== */}
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
        <Badge variant="outline" className="px-4 py-1.5 text-sm font-mono">
          dailyvertexcom.slack.com
        </Badge>
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
          <Badge variant="outline" className="px-3 py-1 text-xs font-mono">
            dailyvertexcom.slack.com
          </Badge>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-foreground">Team sign in</h2>
          <p className="text-sm text-muted-foreground">
            Use your Shah Jewna Slack account. Your name and email are pulled automatically from Slack.
          </p>
        </div>

        {/* Slack button */}
        <a
          href="https://api.dailyvertex.io/auth/slack"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-md text-base font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#4A154B" }}
        >
          <SlackIcon className="h-5 w-5" />
          Sign in with Slack
        </a>

        {/* Info box */}
        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <Info className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-200/90">
            You must be an approved member of <span className="font-semibold">dailyvertexcom.slack.com</span> to access this system.
          </p>
        </div>

        <Separator />

        <p className="text-sm text-center text-muted-foreground">
          Are you a manager?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline underline-offset-2">
            Sign in with email
          </Link>
        </p>
      </div>
    </div>
  </div>
);

export default SlackLogin;
