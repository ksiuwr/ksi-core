// The same locale list drives Wuchale and editable public content.
/** Wuchale treats the first configured locale as its source: UI strings are written in Polish. */
export const frontendLocales = ['pl', 'en-us'] as const;
export type FrontendLocale = (typeof frontendLocales)[number];
/** The UI language until a visitor chooses another one. */
export const defaultFrontendLocale: FrontendLocale = 'pl';
export const contentLocales = ['pl', 'en'] as const;
export type ContentLocale = (typeof contentLocales)[number];
/** User content is written in Polish: the ordinary content fields hold it and it is required. */
export const primaryContentLocale = 'pl' satisfies ContentLocale;
export type TranslationLocale = Exclude<ContentLocale, typeof primaryContentLocale>;
/** Optional translations of the primary content, stored in `translations`. */
export const translationLocales = contentLocales.filter(
  (locale): locale is TranslationLocale => locale !== primaryContentLocale
);
export type ContentTranslations = Partial<
  Record<TranslationLocale, Record<string, string | string[]>>
>;

const localeNames = new Map<string, Intl.DisplayNames>();
export function contentLocaleName(locale: ContentLocale, displayLocale: string): string {
  const key = `${displayLocale}:${locale}`;
  let names = localeNames.get(key);
  if (!names) {
    names = new Intl.DisplayNames([displayLocale], { type: 'language' });
    localeNames.set(key, names);
  }
  const name = names.of(locale) ?? locale;
  return name.charAt(0).toLocaleUpperCase(displayLocale) + name.slice(1);
}
/** Unknown or missing locales read the primary content. */
export function contentLocale(locale: string | null | undefined): ContentLocale {
  if (!locale) return primaryContentLocale;
  try {
    const language = new Intl.Locale(locale).language as ContentLocale;
    return contentLocales.includes(language) ? language : primaryContentLocale;
  } catch {
    return primaryContentLocale;
  }
}
export function localizeContent<T extends object>(
  value: T & { translations?: ContentTranslations },
  locale: string | null | undefined
): T {
  const language = contentLocale(locale);
  const translated = language === primaryContentLocale ? undefined : value.translations?.[language];
  if (!translated) return value;
  const fields = Object.fromEntries(
    Object.entries(translated).filter(([, text]) =>
      Array.isArray(text) ? text.length > 0 : typeof text === 'string' && text.trim().length > 0
    )
  );
  return { ...value, ...fields };
}
export function articleFileContent(value: {
  markdown: string;
  thumbnailFileId?: string | null;
  translations?: ContentTranslations;
}): string {
  return [
    value.markdown,
    value.thumbnailFileId ? `file:${value.thumbnailFileId}` : '',
    ...Object.values(value.translations ?? {})
      .map((fields) => fields?.markdown)
      .filter((text): text is string => typeof text === 'string')
  ].join('\n');
}

/** Translations need the primary text they translate: blank translated fields are always fine. */
export function hasPrimarySources(
  baseline: Record<string, unknown>,
  fields: Record<string, string | string[]>
): boolean {
  return Object.entries(fields).every(([key, value]) => {
    if (Array.isArray(value))
      return !value.length || (Array.isArray(baseline[key]) && baseline[key].length > 0);
    return !value.trim() || (typeof baseline[key] === 'string' && baseline[key].trim().length > 0);
  });
}
