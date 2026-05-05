import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";

type Extracted = {
  name: string;
  price: number;
  category?: string;
  description?: string;
  page?: number;
  image_url?: string;
};

// Convert ArrayBuffer -> base64 without exploding the call stack on big files
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(sub) as any);
  }
  return btoa(binary);
}

// Render every PDF page to a PNG and upload it; returns one image url per page.
async function renderPdfPages(file: File): Promise<string[]> {
  // @ts-ignore - dynamic import keeps SSR happy
  const pdfjs: any = await import("pdfjs-dist");
  // worker via CDN to avoid bundling
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const urls: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.85));
    const path = `pdf-pages/${Date.now()}-p${p}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage.from("prive-media").upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw error;
    const { data } = supabase.storage.from("prive-media").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

export function ImportPdfDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<null | "extract" | "import">(null);
  const [progress, setProgress] = useState<string>("");
  const [items, setItems] = useState<Extracted[]>([]);
  const [pageImages, setPageImages] = useState<string[]>([]);

  async function extract() {
    if (!file) return;
    setBusy("extract");
    setProgress("Renderizando páginas do PDF...");
    try {
      // 1) render pages -> upload -> get urls
      const urls = await renderPdfPages(file);
      setPageImages(urls);

      // 2) send PDF to AI (chunked base64) for product data
      setProgress("Extraindo produtos com IA...");
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const { data, error } = await supabase.functions.invoke("import-products-pdf", {
        body: { pdf_base64: b64, filename: file.name, page_count: urls.length },
      });
      if (error) throw error;
      const products = (data?.products || []) as Extracted[];
      // attach page image as fallback image_url
      const enriched = products.map((p) => ({
        ...p,
        image_url: p.image_url || (p.page && urls[p.page - 1]) || urls[0],
      }));
      if (!enriched.length) toast.error("Nenhum produto encontrado");
      else {
        setItems(enriched);
        toast.success(`${enriched.length} produtos extraídos`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Falha ao processar PDF");
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function importAll() {
    if (!items.length) return;
    setBusy("import");
    const payload = items.map((p) => ({
      name: p.name,
      price: Number(p.price) || 0,
      category: p.category || null,
      description: p.description || null,
      image_url: p.image_url || null,
      active: true,
    }));
    const { error } = await supabase.from("products").insert(payload);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${payload.length} produtos importados`);
    setItems([]); setFile(null); setPageImages([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Importar catálogo via PDF
          </DialogTitle>
          <DialogDescription>
            A IA lê o PDF, extrai nome / preço / categoria e usa a imagem da própria página como foto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Arquivo PDF</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={extract} disabled={!file || !!busy} variant="outline" className="w-full">
            {busy === "extract" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileUp className="w-4 h-4 mr-1" />}
            {progress || "Extrair com IA"}
          </Button>

          {items.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{items.length} produtos prontos:</div>
              <div className="max-h-80 overflow-auto space-y-2 glass rounded-xl p-2">
                {items.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-border/40 pb-2">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-12 h-12 object-cover rounded-md" />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center"><ImageIcon className="w-4 h-4 opacity-50" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.category || "—"} {p.page ? `· pág. ${p.page}` : ""}</div>
                    </div>
                    <div className="text-primary font-display">R$ {Number(p.price).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <Button onClick={importAll} disabled={!!busy} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {busy === "import" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Importar {items.length} produtos
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
