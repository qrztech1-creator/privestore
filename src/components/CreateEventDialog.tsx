import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageInput } from "@/components/ImageInput";
import { supabase } from "@/integrations/supabase/client";
import slugify from "slugify";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

const PALETTES = [
  { name: "Vinho & Marfim", primary: "#5b1a23", accent: "#c97b6b", bg: "#faf3ee", text: "#2a1419" },
  { name: "Rosé & Dourado", primary: "#a85065", accent: "#d4a574", bg: "#fdf2ef", text: "#2a1418" },
  { name: "Noir & Prata", primary: "#1a1a1f", accent: "#8a8a92", bg: "#f5f5f7", text: "#1a1a1f" },
  { name: "Nude & Bordeaux", primary: "#7a3a3a", accent: "#c9956b", bg: "#faf0e6", text: "#2a1410" },
  { name: "Verde Sálvia & Creme", primary: "#3a6b5c", accent: "#a8b89a", bg: "#f0ede0", text: "#1a2820" },
  { name: "Lilás & Champagne", primary: "#7a4a85", accent: "#c9b8d4", bg: "#f5f0fa", text: "#201828" },
];

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function CreateEventDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (b: boolean) => void; onCreated?: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  const [bride, setBride] = useState("");
  const [partner, setPartner] = useState("");
  const [type, setType] = useState("casamento");
  const [date, setDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [banner, setBanner] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [playlist, setPlaylist] = useState("");
  const [palette, setPalette] = useState(PALETTES[0]);
  const [thankYou, setThankYou] = useState("");

  function reset() {
    setStep(1); setBride(""); setPartner(""); setType("casamento"); setDate("");
    setPhone(""); setEmail(""); setBanner(null); setMessage(""); setPlaylist("");
    setPalette(PALETTES[0]); setThankYou("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const baseSlug = slugify(`${bride}-${type}`, { lower: true, strict: true });
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const manage_token = randomToken();
    const { data, error } = await supabase.from("events").insert({
      owner_id: user?.id ?? null,
      slug,
      type: type as "casamento" | "cha_lingerie" | "despedida_solteira",
      bride_name: bride,
      partner_name: partner || null,
      event_date: date || null,
      contact_email: email || null,
      contact_phone: phone || null,
      whatsapp_number: phone || null,
      banner_url: banner,
      message: message || null,
      playlist_url: playlist || null,
      palette,
      thank_you_message: thankYou || null,
      visibility: "private",
      manage_token,
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Evento cadastrado ✨");
    onOpenChange(false);
    reset();
    onCreated?.();
    if (data) nav({ to: "/admin/eventos/$id", params: { id: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Nova noiva</DialogTitle>
          <p className="text-sm text-muted-foreground">Etapa {step} de 2 — {step === 1 ? "informações básicas" : "personalização da página"}</p>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 mt-2">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome da noiva *</Label><Input required value={bride} onChange={(e) => setBride(e.target.value)} /></div>
                <div><Label>Parceiro(a)</Label><Input value={partner} onChange={(e) => setPartner(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de evento</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casamento">Casamento</SelectItem>
                      <SelectItem value="cha_lingerie">Chá de Lingerie</SelectItem>
                      <SelectItem value="despedida_solteira">Despedida de Solteira</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>WhatsApp (DDI+DDD+nº)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5527992042450" /></div>
                <div><Label>E-mail da noiva</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button" disabled={!bride} onClick={() => setStep(2)} className="bg-primary text-primary-foreground">Próximo →</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <ImageInput
                label="Imagem de capa"
                value={banner}
                onChange={setBanner}
                prompt={`${bride} ${partner} ${type}`}
                folder="banners"
              />
              <div>
                <Label>Mensagem da noiva</Label>
                <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Compartilhe um recado especial com as convidadas..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Playlist (Spotify ou YouTube)</Label>
                  <Input value={playlist} onChange={(e) => setPlaylist(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>Mensagem de agradecimento</Label>
                  <Input value={thankYou} onChange={(e) => setThankYou(e.target.value)} placeholder="Após o pagamento" />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Paleta de cores</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PALETTES.map((p) => {
                    const active = palette.name === p.name;
                    return (
                      <button type="button" key={p.name} onClick={() => setPalette(p)}
                        className={`p-3 rounded-xl border text-left transition ${active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}>
                        <div className="flex gap-1 mb-2">
                          <div className="w-5 h-5 rounded-full" style={{ background: p.primary }} />
                          <div className="w-5 h-5 rounded-full" style={{ background: p.accent }} />
                        </div>
                        <div className="text-xs">{p.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>← Voltar</Button>
                <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground">
                  {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar e abrir painel
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
