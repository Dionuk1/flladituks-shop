import { Info } from "lucide-react";

export function PaymentNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-900 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100 ${className}`}
    >
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200">
        <Info className="h-4 w-4" />
      </div>
      <p>
        <span className="font-semibold">💡 Njoftim:</span>{" "}
        Pagesat me <strong>OneFor</strong> dhe <strong>Paysera</strong> janë të disponueshme
        vetëm për porositë mbi <strong>20€</strong> (ku transporti është{" "}
        <strong>FALAS</strong>). Për porositë nën 20€, aplikohet vetëm{" "}
        <strong>Pagesa në Dorëzim</strong>.
      </p>
    </div>
  );
}
