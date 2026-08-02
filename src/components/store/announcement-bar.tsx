import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const MESSAGES = [
  "🚚 Transport FALAS për porositë mbi 25€!",
  "💵 Pagesa bëhet në dorëzim — pa rrezik!",
  "⚡ Dërgesa brenda 24-48 orëve në të gjithë Kosovën.",
  "🎁 Produkte të reja shtohen çdo javë — mos i humb!",
  "📞 Na kontakto për çdo pyetje, jemi këtu për ty.",
];

export function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 350);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="gradient-brand text-white">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 overflow-hidden px-4 text-center">
        <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" />
        <p
          key={index}
          className={`text-xs font-medium transition-all duration-300 sm:text-sm ${
            visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          {MESSAGES[index]}
        </p>
      </div>
    </div>
  );
}
