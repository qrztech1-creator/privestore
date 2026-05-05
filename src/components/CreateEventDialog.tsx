import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import slugify from "slugify";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function CreateEventDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (b: boolean) => void; onCreated?: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [bride, setBride] = useState("");
  const [partner, setPartner] = useState("");
  const [type, setType] = useState("casamento");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const baseSlug = slugify(`${bride}-${type}`, { lower: true, strict: true });
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from("events").insert({
      owner_id: user.id, slug, type: type as any, bride_name: bride,
      partner_name: partner || null, event_date: date || null,
      visibility: "private",
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Evento criado ✨");
    onOpenChange(false);
    onCreated?.();
    if (data) nav({ to: "/painel/$slug", params: { slug: data.slug } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass">
        <DialogHeader><DialogTitle className="font-display text-2xl">Novo evento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Nome da noiva</Label><Input required value={bride} onChange={(e) => setBride(e.target.value)} /></div>
          <div><Label>Parceiro(a) — opcional</Label><Input value={partner} onChange={(e) => setPartner(e.target.value)} /></div>
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
          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar e personalizar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
