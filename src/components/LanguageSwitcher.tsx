import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/hooks/use-i18n";
import { LOCALE_OPTIONS } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  align?: "start" | "center" | "end";
};

export function LanguageSwitcher({ className, align = "end" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          aria-label={t("nav.language")}
        >
          <Languages className="h-4 w-4" />
          {t("nav.language")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[11rem]">
        {LOCALE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => setLocale(option.code)}
            className="gap-2"
          >
            <span className="text-base leading-none" aria-hidden>
              {option.flag}
            </span>
            <span className="flex-1">{option.label}</span>
            {locale === option.code ? <Check className="h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
