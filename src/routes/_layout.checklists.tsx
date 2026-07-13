import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { CheckSquare, Square, Trash2, ListChecks, AlertCircle, Share2, Mail, MessageCircle, Copy, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { Checklist } from "@/lib/checklists-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useChecklistsStore } from "@/lib/checklists-store";
import { WeightExplainButton } from "@/components/WeightExplainButton";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_layout/checklists")({
  component: ChecklistsPage,
});

function ChecklistsPage() {
  const { t, tc } = useI18n();
  const checklists = useChecklistsStore((s) => s.checklists);
  const toggleItem = useChecklistsStore((s) => s.toggleItem);
  const removeChecklist = useChecklistsStore((s) => s.removeChecklist);

  // Reminder on mount: if any checklist has pending items, warn
  const reminders = useMemo(
    () =>
      checklists
        .map((c) => ({ c, pending: c.items.filter((i) => !i.checked) }))
        .filter((x) => x.pending.length > 0),
    [checklists],
  );

  useEffect(() => {
    if (reminders.length === 0) return;
    const timeoutId = setTimeout(() => {
      reminders.forEach(({ c, pending }) => {
        toast.warning(t("checklists.reminderTitle", { count: pending.length, title: c.title }), {
          description: pending
            .slice(0, 4)
            .map((p) => `• ${p.name}`)
            .join("\n") + (pending.length > 4 ? `\n${t("checklists.reminderMore", { count: pending.length - 4 })}` : ""),
          duration: 6000,
        });
      });
    }, 600);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("checklists.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("checklists.subtitle")}
          </p>
        </div>
        <Link to="/assistant">
          <Button>{t("checklists.createNew")}</Button>
        </Link>
      </div>

      {checklists.length === 0 ? (
        <Card className="p-12 text-center">
          <ListChecks className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">{t("checklists.emptyTitle")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("checklists.emptyDesc")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {checklists.map((c) => {
            const done = c.items.filter((i) => i.checked).length;
            const pct = Math.round((done / c.items.length) * 100);
            const pending = c.items.length - done;
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="p-5 border-b border-border bg-muted/30 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg truncate">{c.title}</h2>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{c.destination}</Badge>
                      <Badge variant="outline">
                        {c.days} {c.days === 1 ? t("common.daysOne") : t("common.daysMany")}
                      </Badge>
                      <Badge variant="outline">{c.occasion}</Badge>
                      <Badge variant="outline">{c.weather}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {done}/{c.items.length}
                      </div>
                      <div className="text-xs text-muted-foreground">{pct}%</div>
                    </div>
                    <ShareChecklistButton checklist={c} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        removeChecklist(c.id);
                        toast.success(t("checklists.deleted"));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {pending > 0 && (
                  <div className="px-5 py-2 bg-amber-500/10 border-b border-border flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    {t("checklists.pendingLine", { count: pending })}
                  </div>
                )}

                <div className="p-2">
                  {c.items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => toggleItem(c.id, it.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 text-left transition-colors"
                    >
                      {it.checked ? (
                        <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={`flex-1 text-sm ${
                          it.checked
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {it.name}
                        {it.quantity > 1 ? ` (x${it.quantity})` : ""}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {tc(it.category)}
                      </Badge>
                      <span className="inline-flex w-20 items-center justify-end gap-0.5 text-xs text-muted-foreground">
                        {(it.weight * it.quantity).toFixed(2)} kg
                        <WeightExplainButton
                          name={it.name}
                          category={it.category}
                          weight={it.weight}
                          quantity={it.quantity}
                          source="imported"
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildShareText(
  c: Checklist,
  t: ReturnType<typeof useI18n>["t"],
  tc: ReturnType<typeof useI18n>["tc"],
) {
  const header = `🧳 ${t("checklists.shareHeader", { title: c.title })}\n📍 ${t("checklists.shareMeta", {
    destination: c.destination,
    days: c.days,
    dayLabel: c.days === 1 ? t("common.daysOne") : t("common.daysMany"),
    occasion: c.occasion,
    weather: c.weather,
  })}\n\n`;
  const byCat = c.items.reduce<Record<string, typeof c.items>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});
  const body = Object.entries(byCat)
    .map(([cat, items]) => {
      const lines = items
        .map((i) => `  ${i.checked ? "✅" : "⬜"} ${i.name}${i.quantity > 1 ? ` (x${i.quantity})` : ""}`)
        .join("\n");
      return `▸ ${tc(cat)}\n${lines}`;
    })
    .join("\n\n");
  const total = c.items.reduce((s, i) => s + i.weight * i.quantity, 0);
  return `${header}${body}\n\n${t("checklists.totalWeight", { weight: total.toFixed(2) })}\n\n${t("checklists.sharedFrom")} 🐺`;
}

function ShareChecklistButton({ checklist }: { checklist: Checklist }) {
  const { t, tc } = useI18n();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const text = buildShareText(checklist, t, tc);

  const copy = async (value: string, label = t("checklists.copied")) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error(t("checklists.copyFailed"));
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: checklist.title,
          text,
        });
        return;
      } catch {
        // user cancelled or unsupported, fallback below
      }
    }
    copy(text, t("checklists.copiedShareFallback"));
  };

  const sendEmails = () => {
    const list = emails
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error(t("checklists.emailRequired"));
      return;
    }
    const subject = encodeURIComponent(t("checklists.emailSubject", { title: checklist.title }));
    const body = encodeURIComponent(text);
    window.location.href = `mailto:${list.join(",")}?subject=${subject}&body=${body}`;
    setOpen(false);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title={t("checklists.shareTitle")}
      >
        <Share2 className="h-4 w-4 text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" /> {t("checklists.shareTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("checklists.shareDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={nativeShare}>
                <Share2 className="h-4 w-4 mr-2" /> {t("common.share")}
              </Button>
              <Button variant="outline" asChild>
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" /> {t("checklists.whatsapp")}
                </a>
              </Button>
              <Button variant="outline" onClick={() => copy(text)}>
                <Copy className="h-4 w-4 mr-2" /> {t("checklists.copy")}
              </Button>
              <Button
                variant="outline"
                onClick={() => copy(window.location.href, t("checklists.copied"))}
              >
                <LinkIcon className="h-4 w-4 mr-2" /> {t("checklists.link")}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" /> {t("checklists.email")}
              </label>
              <Input
                placeholder={t("checklists.emailPlaceholder")}
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("checklists.emailHint")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("checklists.preview")}</label>
              <Textarea
                readOnly
                value={text}
                className="h-40 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={sendEmails}>
              <Mail className="h-4 w-4 mr-2" /> {t("checklists.sendEmail")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
