import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Sparkles, Link as LinkIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  prompt?: string; // for AI generation
  label?: string;
  folder?: string;
}

export function ImageInput({ value, onChange, prompt, label = "Imagem", folder = "uploads" }: Props) {
  const [busy, setBusy] = useState<null | "upload" | "ai" | "url">(null);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy("upload");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("prive-media").upload(path, file, { upsert: false });
    setBusy(null);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("prive-media").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("Imagem enviada");
  }

  async function handleAI() {
    if (!prompt) return toast.error("Informe um nome/descrição primeiro");
    setBusy("ai");
    try {
      const { data, error } = await supabase.functions.invoke("generate-banner", { body: { prompt } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // upload data url to storage so it persists
      const blob = await (await fetch(data.imageUrl)).blob();
      const path = `${folder}/ai-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("prive-media").upload(path, blob, { contentType: "image/png" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("prive-media").getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success("Banner gerado por IA ✨");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar imagem");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border group">
          <img src={value} alt="" className="w-full h-48 object-cover" />
          <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition" onClick={() => onChange(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground glass">
          Nenhuma imagem. Faça upload, cole um link ou gere com IA.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={!!busy}>
          {busy === "upload" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleAI} disabled={!!busy || !prompt}>
          {busy === "ai" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Gerar com IA
        </Button>
        <div className="flex gap-1 flex-1 min-w-[200px]">
          <Input placeholder="ou cole um link" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="h-9" />
          <Button type="button" size="sm" variant="outline" onClick={() => { if (urlInput) { onChange(urlInput); setUrlInput(""); } }}>
            <LinkIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
