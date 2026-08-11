import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

const KEY = "flladituks_cookie_consent";

export function CookieBanner() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: true, marketing: false });

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  function save(all: boolean) {
    const value = all ? { analytics: true, marketing: true } : prefs;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...value, necessary: true, at: Date.now() }));
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] sm:right-auto sm:max-w-sm">
      <div className="animate-fade-in rounded-2xl border bg-card p-4 shadow-xl glow-primary">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm text-foreground">{t("cookies.text")}</p>

            {settings && (
              <div className="mt-3 space-y-2 rounded-xl bg-secondary/60 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <Label className="text-xs">{t("cookies.necessary")}</Label>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <Label htmlFor="ck-analytics" className="text-xs">
                    {t("cookies.analytics")}
                  </Label>
                  <Switch
                    id="ck-analytics"
                    checked={prefs.analytics}
                    onCheckedChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <Label htmlFor="ck-marketing" className="text-xs">
                    {t("cookies.marketing")}
                  </Label>
                  <Switch
                    id="ck-marketing"
                    checked={prefs.marketing}
                    onCheckedChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                  />
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Button size="sm" className="rounded-full hover-lift" onClick={() => save(!settings)}>
                {settings ? t("cookies.save") : t("cookies.accept")}
              </Button>
              {!settings && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setSettings(true)}
                >
                  {t("cookies.settings")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
