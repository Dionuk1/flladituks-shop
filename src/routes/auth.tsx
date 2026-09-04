import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck, ArrowLeft } from "lucide-react";
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
          "Hyr në llogarinë tënde FlladituKS me kod verifikimi 6-shifror të dërguar në email.",
      },
      { property: "og:title", content: "Hyr ose Regjistrohu — FlladituKS" },
      {
        property: "og:description",
        content: "Verifikim i sigurt me kod 6-shifror në email.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hyr ose Regjistrohu — FlladituKS" },
      {
        name: "twitter:description",
        content: "Verifikim i sigurt me kod 6-shifror në email.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Email i pavlefshëm");

function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionEmail(data.user?.email ?? null));
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error("Nuk u dërgua kodi", { description: error.message });
      return;
    }
    setStep("code");
    toast.success("Kodi u dërgua", { description: `Kontrollo emailin ${parsed.data}` });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      toast.error("Shkruaj kodin 6-shifror");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    setLoading(false);
    if (error) {
      toast.error("Kodi është i pavlefshëm ose ka skaduar", { description: error.message });
      return;
    }
    toast.success("Je kyçur me sukses!");
    navigate({ to: "/" });
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
          <h1 className="text-2xl font-extrabold tracking-tight">
            {sessionEmail ? "Llogaria juaj" : "Hyr ose Regjistrohu"}
          </h1>

          {sessionEmail ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                I kyçur si <span className="font-semibold text-foreground">{sessionEmail}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={signOut}>
                  Çkyçu
                </Button>
                <Button asChild className="rounded-full">
                  <Link to="/">Vazhdo blerjet</Link>
                </Button>
              </div>
            </div>
          ) : step === "email" ? (
            <form onSubmit={sendCode} className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Shkruaj emailin — do të marrësh një kod verifikimi 6-shifror.
              </p>
              <div>
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ti@example.com"
                  required
                />
              </div>
              <Button type="submit" size="lg" disabled={loading} className="w-full rounded-full">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Dërgo kodin
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Kodi u dërgua te <span className="font-semibold text-foreground">{email}</span>.
              </p>
              <div>
                <Label htmlFor="auth-code">Kodi 6-shifror</Label>
                <Input
                  id="auth-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="text-center text-2xl tracking-[0.5em]"
                  required
                />
              </div>
              <Button type="submit" size="lg" disabled={loading} className="w-full rounded-full">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Verifiko dhe hyr
              </Button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" /> Ndrysho emailin
              </button>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
