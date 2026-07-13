import { useLocaleStore, type Locale } from "@/lib/i18n/locale-store";
import { translate, type TranslationKey } from "@/lib/i18n/translations";

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const t = (key: TranslationKey) => translate(locale, key);

  return { locale, setLocale, t };
}

export type { Locale, TranslationKey };
