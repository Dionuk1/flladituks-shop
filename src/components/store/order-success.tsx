import { useI18n } from "@/lib/i18n";

const PIECES = Array.from({ length: 28 }).map((_, i) => ({
  left: (i * 37) % 100,
  dx: ((i * 53) % 120) - 60,
  delay: ((i * 7) % 60) / 100,
  color: ["bg-primary", "bg-success", "bg-warning", "bg-accent"][i % 4],
}));

export function OrderSuccessOverlay() {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-background/80 backdrop-blur-sm">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/4 h-0 overflow-visible">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className={`animate-confetti absolute h-2 w-2 rounded-[2px] ${p.color}`}
            style={
              {
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                "--dx": `${p.dx}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="animate-scale-in relative rounded-3xl border bg-card px-10 py-8 text-center shadow-2xl glow-primary">
        <svg viewBox="0 0 52 52" className="mx-auto h-20 w-20">
          <circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            className="stroke-success"
            strokeWidth="3"
            strokeDasharray="151"
            strokeDashoffset="151"
            style={{ animation: "check-draw 0.6s ease-out forwards" }}
          />
          <path
            d="M15 27l8 8 15-16"
            fill="none"
            className="stroke-success"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="40"
            strokeDashoffset="40"
            style={{ animation: "check-draw 0.4s 0.5s ease-out forwards" }}
          />
        </svg>
        <h2 className="mt-4 text-xl font-bold">{t("success.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("success.sub")}</p>
      </div>
    </div>
  );
}
