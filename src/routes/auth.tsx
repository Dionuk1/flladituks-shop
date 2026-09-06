import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreHeader } from "@/components/store/store-header";
import { SiteFooter } from "@/components/store/site-footer";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Hyr ose Regjistrohu — FlladituKS" },
      {
        name: "description",
        content:
          "Hyr në llogarinë tënde FlladituKS me email dhe fjalëkalim, ose regjistrohu për të ndjekur porositë.",
      },
      { property: "og:title", content: "Hyr ose Regjistrohu — FlladituKS" },
      {
        property: "og:description",
        content: "Hyrje e sigurt me email dhe fjalëkalim ose me Google.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hyr ose Regjistrohu — FlladituKS" },
      {
        name: "twitter:description",
        content: "Hyrje e sigurt me email dhe fjalëkalim ose me Google.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Email i pavlefshëm");
const passwordSchema = z.string().min(6, "Fjalëkalimi duhet të ketë së paku 6 karaktere");

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionEmail(data.user?.email ?? null));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      toast.error(parsedEmail.error.issues[0]!.message);
      return;
    }
    const parsedPass = passwordSchema.safeParse(password);
    if (!parsedPass.success) {
      toast.error(parsedPass.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsedEmail.data,
          password: parsedPass.data,
        });
        if (error) {
          toast.error("Hyrja dështoi", { description: error.message });
          return;
        }
        toast.success("Je kyçur me sukses!");
        navigate({ to: "/account" });
      } else {
        if (fullName.trim().length < 2) {
          toast.error("Shkruaj emrin tënd të plotë");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsedEmail.data,
          password: parsedPass.data,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) {
          toast.error("Regjistrimi dështoi", { description: error.message });
          return;
        }
        if (data.session) {
          toast.success("Llogaria u krijua!");
          navigate({ to: "/account" });
        } else {
          toast.success("Llogaria u krijua", {
            description: "Konfirmo emailin për të vazhduar.",
          });
          setMode("login");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Hyrja me Google dështoi", { description: error.message });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSessionEmail(null);
    toast.success("U çkyçe");
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
        <div className="rounded-2xl border bg-card p-6 shadow-lg">
          {sessionEmail ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Llogaria juaj</h1>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  I kyçur si <span className="font-semibold text-foreground">{sessionEmail}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-full" onClick={signOut}>
                    Çkyçu
                  </Button>
                  <Button asChild className="rounded-full">
                    <Link to="/account">Shko te llogaria</Link>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-full py-2 text-sm font-semibold transition ${
                    mode === "login" ? "bg-card shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Hyr
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`rounded-full py-2 text-sm font-semibold transition ${
                    mode === "register" ? "bg-card shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Regjistrohu
                </button>
              </div>

              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
                {mode === "login" ? "Hyr në llogari" : "Krijo llogari të re"}
              </h1>

              <form onSubmit={submit} className="mt-4 space-y-4">
                {mode === "register" && (
                  <div>
                    <Label htmlFor="auth-name">Emri i plotë</Label>
                    <Input
                      id="auth-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="P.sh. Filan Fisteku"
                      required
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="auth-email">Email</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ti@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="auth-pass">Fjalëkalimi</Label>
                  <Input
                    id="auth-pass"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    required
                  />
                </div>
                <Button type="submit" size="lg" disabled={loading} className="w-full rounded-full">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : mode === "login" ? (
                    <LogIn className="mr-2 h-4 w-4" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {mode === "login" ? "Hyr" : "Regjistrohu"}
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ose <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={google}
                className="w-full rounded-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
                  />
                  <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
                  <path
                    fill="#EA4335"
                    d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
                  />
                </svg>
                Kyçuni me Google
              </Button>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
