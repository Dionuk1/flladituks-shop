import { useI18n, type Lang } from "@/lib/i18n";

const OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: "sq", flag: "🇦🇱", label: "SQ" },
  { code: "en", flag: "🇬🇧", label: "EN" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`relative flex items-center rounded-full border bg-card p-0.5 text-xs font-semibold ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => setLang(o.code)}
          aria-pressed={lang === o.code}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 transition-all duration-200 ${
            lang === o.code
              ? "bg-primary text-primary-foreground glow-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span aria-hidden>{o.flag}</span>
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
