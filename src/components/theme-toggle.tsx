import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Kalo në modalitetin e ndritshëm" : "Kalo në modalitetin e errët"}
      title={theme === "dark" ? "Modaliteti i ndritshëm" : "Modaliteti i errët"}
      className={`rounded-full ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
