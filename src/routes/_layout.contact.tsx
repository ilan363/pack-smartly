import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { CONTACT_FAQ_ITEMS } from "@/lib/contact-faq";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_layout/contact")({
  component: ContactPage,
});

function ContactPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("contact.title")}</h1>
            <p className="text-sm text-muted-foreground sm:text-base">{t("contact.subtitle")}</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-border p-4 sm:p-6">
        <Accordion type="single" collapsible className="w-full">
          {CONTACT_FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-border">
              <AccordionTrigger className="py-4 text-left text-base font-medium hover:no-underline">
                {t(item.questionKey)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {t(item.answerKey)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("contact.authorHeading")}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 font-medium text-foreground">{t("contact.authorLabel")}</dt>
              <dd className="text-muted-foreground">Ilan Manbrut</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 font-medium text-foreground">Gmail</dt>
              <dd>
                <a
                  href="mailto:josemanbrut@gmail.com"
                  className="text-primary hover:underline"
                >
                  josemanbrut@gmail.com
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 font-medium text-foreground">Instagram</dt>
              <dd>
                <a
                  href="https://instagram.com/travel_wolf1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @travel_wolf1
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 font-medium text-foreground">{t("contact.phoneLabel")}</dt>
              <dd>
                <a href="tel:+541125294883" className="text-primary hover:underline">
                  11 25294883
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </Card>
    </div>
  );
}
