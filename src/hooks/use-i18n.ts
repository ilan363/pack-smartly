import { useLocaleStore, type Locale } from "@/lib/i18n/locale-store";
import { categoryTranslationKey } from "@/lib/i18n/categories";
import { dateLocaleFor } from "@/lib/i18n/format";
import { translate, type TranslationKey } from "@/lib/i18n/translations";

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const tc = (category: string) => {
    const key = categoryTranslationKey(category);
    return key ? t(key) : category;
  };

  return { locale, setLocale, t, tc, dateLocale: dateLocaleFor(locale) };
}

export type { Locale, TranslationKey };
