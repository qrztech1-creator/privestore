import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles } from "lucide-react";

type Extracted = { name: string; price: number; category?: string; description?: string };

export function ImportPdfDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Extracted[]>([]);

  async function extract() {
    if (!file) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const { data, error } = await supabase.functions.invoke("import-products-pdf", {
        body: { pdf_base64: b64, filename: file.name },
      });
      if (error) throw error;
      const products = (data?.products || []) as Extracted[];
      if (!products.length) {
        toast.error("Nenhum produto encontrado no PDF");
      } else {
        setItems(products);
        toast.success(`${products.length} produtos extraídos. Revise e importe.`);
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao processar PDF");
    } finally {
      setBusy(false);
    }
  }

  async function importAll() {
    if (!items.length) return;
    setBusy(true);
    const payload = items.map((p) => ({
      name: p.name,
      price: Number(p.price) || 0,
      category: p.category || null,
      description: p.description || null,
      active: true,
    }));
    const { error } = await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${payload.length} produtos importados`);
    setItems([]);
    setFile(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Importar catálogo via PDF
          </DialogTitle>
          <DialogDescription>
            Envie o PDF do catálogo e a IA extrai nome, preço e categoria de cada produto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Arquivo PDF</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={extract} disabled={!file || busy} variant="outline" className="flex-1">
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileUp className="w-4 h-4 mr-1" />}
              Extrair com IA
            </Button>
          </div>
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{items.length} produtos prontos para importar:</div>
              <div className="max-h-64 overflow-auto space-y-1 glass rounded-xl p-2">
                {items.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm border-b border-border/40 pb-1">
                    <span className="truncate">{p.name} <span className="text-xs text-muted-foreground">{p.category}</span></span>
                    <span className="text-primary">R$ {Number(p.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Button onClick={importAll} disabled={busy} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Importar {items.length} produtos
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
