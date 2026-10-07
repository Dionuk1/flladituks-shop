import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreHeader } from "@/components/store/store-header";
import { SiteFooter } from "@/components/store/site-footer";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reseto fjalëkalimin — FlladituKS" },
      { name: "description", content: "Vendos një fjalëkalim të ri për llogarinë tënde FlladituKS." },
      { property: "og:title", content: "Reseto fjalëkalimin — FlladituKS" },
      { property: "og:description", content: "Vendos një fjalëkalim të ri për llogarinë tënde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pass.length < 6) return toast.error("Fjalëkalimi duhet të ketë së paku 6 karaktere");
    if (pass !== pass2) return toast.error("Fjalëkalimet nuk përputhen");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) return toast.error("Ruajtja dështoi", { description: error.message });
    toast.success("Fjalëkalimi u ndryshua me sukses!");
    navigate({ to: "/account" });
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
        <div className="rounded-2xl border bg-card p-6 shadow-lg">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <KeyRound className="h-6 w-6 text-primary" /> Reseto fjalëkalimin
          </h1>
          {!ready ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Hape këtë faqe nga linku që të dërguam me email. Nëse linku ka skaduar, kërko një të ri te
              faqja e hyrjes.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="np">Fjalëkalimi i ri</Label>
                <Input id="np" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="np2">Përsërit fjalëkalimin</Label>
                <Input id="np2" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} required />
              </div>
              <Button type="submit" size="lg" disabled={loading} className="w-full rounded-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ruaj fjalëkalimin
              </Button>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
