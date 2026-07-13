import { useLocaleStore, type Locale } from "@/lib/i18n/locale-store";
import { categoryTranslationKey } from "@/lib/i18n/categories";
import { dateLocaleFor } from "@/lib/i18n/format";
import { translateItemName, translateOccasion } from "@/lib/i18n/pack-items";
import { translate, type TranslationKey } from "@/lib/i18n/translations";
import type { AuthErrorCode } from "@/lib/i18n/translations-dynamic";

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const tc = (category: string) => {
    const key = categoryTranslationKey(category);
    return key ? t(key) : category;
  };

  const ti = (name: string) => translateItemName(name, locale);

  const to = (occasion: string) => translateOccasion(occasion, locale);

  const tAuthError = (code: AuthErrorCode) => t(code);

  return { locale, setLocale, t, tc, ti, to, tAuthError, dateLocale: dateLocaleFor(locale) };
}

export type { Locale, TranslationKey };
