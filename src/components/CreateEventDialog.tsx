import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import slugify from "slugify";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

function randomToken() {
  // 32 hex chars, browser-safe
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function CreateEventDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (b: boolean) => void; onCreated?: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [bride, setBride] = useState("");
  const [partner, setPartner] = useState("");
  const [type, setType] = useState("casamento");
  const [date, setDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const baseSlug = slugify(`${bride}-${type}`, { lower: true, strict: true });
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const manage_token = randomToken();
    const { data, error } = await supabase.from("events").insert({
      owner_id: user?.id ?? null,
      slug, type: type as any, bride_name: bride,
      partner_name: partner || null, event_date: date || null,
      contact_email: email || null, contact_phone: phone || null,
      visibility: "private",
      manage_token,
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Noiva cadastrada ✨");
    onOpenChange(false);
    onCreated?.();
    if (data) nav({ to: "/admin/eventos/$id", params: { id: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass">
        <DialogHeader><DialogTitle className="font-display text-2xl">Nova noiva</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Nome da noiva *</Label><Input required value={bride} onChange={(e) => setBride(e.target.value)} /></div>
          <div><Label>Parceiro(a)</Label><Input value={partner} onChange={(e) => setPartner(e.target.value)} /></div>
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
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>WhatsApp</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511..." /></div>
          </div>
          <div><Label>Email da noiva</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Cadastrar e personalizar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
