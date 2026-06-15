import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/importo")({
  component: ImportPage,
});

const COLUMNS = ["Titulli", "Pershkrimi", "Cmimi", "FotoURL", "Kategoria", "Sasia", "Gjendja"];

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    COLUMNS,
    ["Bluzë verore", "Bluzë e lehtë për verë", 14.99, "https://example.com/foto.jpg", "Veshje", 10, "I ri"],
    ["Këpucë sportive", "Këpucë komode për vrapim", 49.5, "https://example.com/kepuce.jpg", "Këpucë", 5, "I ri"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produktet");
  XLSX.writeFile(wb, "flladituks-template.xlsx");
}

type Row = Record<string, any>;

function ImportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const qc = useQueryClient();

  function handleFile(file: File) {
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
        setRows(json);
        toast.success(`U lexuan ${json.length} rreshta`);
      } catch (err: any) {
        toast.error("Skedari nuk u lexua", { description: err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function importAll() {
    if (rows.length === 0) return;
    setImporting(true);
    const records = rows
      .map((r) => {
        const title = String(r.Titulli || r.titulli || r.title || "").trim();
        const price = Number(r.Cmimi || r.cmimi || r.price || 0);
        if (!title || isNaN(price)) return null;
        return {
          title,
          description: String(r.Pershkrimi || r.pershkrimi || r.description || "").trim() || null,
          price,
          image_url: String(r.FotoURL || r.fotourl || r.image_url || "").trim() || null,
          category: String(r.Kategoria || r.kategoria || r.category || "").trim() || null,
          stock: Number(r.Sasia || r.sasia || r.stock || 1),
          condition: String(r.Gjendja || r.gjendja || r.condition || "I ri").trim(),
          status: "available",
        };
      })
      .filter(Boolean) as any[];

    const skipped = rows.length - records.length;
    if (records.length === 0) {
      setImporting(false);
      toast.error("Asnjë rresht i vlefshëm për të importuar");
      return;
    }
    const { error } = await supabase.from("products").insert(records);
    setImporting(false);
    if (error) {
      toast.error("Importi dështoi", { description: error.message });
      return;
    }
    setResult({ inserted: records.length, skipped });
    setRows([]);
    setFileName("");
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    toast.success(`${records.length} produkte u shtuan!`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importo nga Excel</h1>
        <p className="text-sm text-muted-foreground">
          Ngarko një skedar .xlsx ose .csv me kolonat e sakta për të shtuar produkte në masë.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Hapi 1: Shkarko template-in</p>
            <p className="text-sm text-muted-foreground">
              Përdor këtë skedar shembull për të mos pasur gabime me kolonat.
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate} className="rounded-full">
            <Download className="mr-2 h-4 w-4" /> Shkarko Template-in e Excel-it
          </Button>
        </div>

        <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Kolonat e pranueshme:</p>
          <p className="mt-1">{COLUMNS.join(" · ")}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="mb-3 font-semibold">Hapi 2: Ngarko skedarin</p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-secondary/30 p-8 text-center hover:bg-secondary/60">
          <Upload className="h-8 w-8 text-primary" />
          <span className="font-medium">Kliko për të zgjedhur skedarin</span>
          <span className="text-xs text-muted-foreground">Pranohen: .xlsx, .xls, .csv</span>
          {fileName && <span className="mt-1 text-sm text-primary">{fileName}</span>}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>

        {rows.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border bg-secondary/30 p-3 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="font-medium">{rows.length} rreshta gati për import</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Kontrollo paraprakisht 3 rreshtat e parë më poshtë.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left">
                  <tr>
                    {COLUMNS.map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((r, i) => (
                    <tr key={i} className="border-t">
                      {COLUMNS.map((c) => (
                        <td key={c} className="px-3 py-2 text-muted-foreground">
                          {String(r[c] ?? r[c.toLowerCase()] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={importAll}
              disabled={importing}
              className="w-full rounded-full"
              size="lg"
            >
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importo {rows.length} produkte
            </Button>
          </div>
        )}

        {result && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
            <div className="text-sm">
              <p className="font-semibold">Importi përfundoi me sukses!</p>
              <p className="text-muted-foreground">
                {result.inserted} produkte u shtuan
                {result.skipped > 0 ? ` · ${result.skipped} rreshta u shpërfillën` : ""}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
