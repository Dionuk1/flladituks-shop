import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Truck,
  Banknote,
  ShieldCheck,
  Instagram,
  Facebook,
  Phone,
  Mail,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="relative mt-16 overflow-hidden border-t bg-card">
      {/* atmospheric breeze waves */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-20">
        <div className="breeze-wave absolute -left-10 top-6 h-24 w-[130%] rounded-[100%] bg-primary/30 blur-3xl" />
        <div
          className="breeze-wave absolute -left-10 top-16 h-20 w-[130%] rounded-[100%] bg-primary/20 blur-2xl"
          style={{ animationDelay: "-5s" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Flladitu<span className="text-primary">KS</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("footer.tagline")}</p>
          <div className="mt-4 flex gap-2">
            {[
              { Icon: Instagram, href: "https://instagram.com", label: "Instagram" },
              { Icon: Facebook, href: "https://facebook.com", label: "Facebook" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-full border bg-background text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:border-primary hover:text-primary glow-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{t("footer.links")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                to="/"
                className="inline-block transition-all duration-200 hover:-translate-y-0.5 hover:text-primary"
              >
                {t("footer.home")}
              </Link>
            </li>
            <li>
              <a
                href="#produktet"
                className="inline-block transition-all duration-200 hover:-translate-y-0.5 hover:text-primary"
              >
                {t("footer.deals")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{t("footer.support")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> +383 44 000 000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> info@flladituks.com
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          {[
            { Icon: Truck, label: t("footer.trustDelivery") },
            { Icon: Banknote, label: t("footer.trustCod") },
            { Icon: ShieldCheck, label: t("hero.quality") },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60"
            >
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="relative border-t">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} FlladituKS — {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
