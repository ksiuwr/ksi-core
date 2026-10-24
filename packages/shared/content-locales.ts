// The same locale list drives Wuchale and editable public content.
export const frontendLocales = ['en-us', 'pl'] as const;
export const contentLocales = ['en', 'pl'] as const;
export type ContentLocale = (typeof contentLocales)[number];
export type ContentTranslations = Partial<Record<ContentLocale, Record<string, string | string[]>>>;
export function contentLocale(locale: string | null | undefined): ContentLocale {
  return locale === 'pl' ? 'pl' : 'en';
}
export function localizeContent<T extends object>(
  value: T & { translations?: ContentTranslations },
  locale: string | null | undefined
): T {
  const translated = value.translations?.[contentLocale(locale)];
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

export function hasEnglishSources(
  baseline: Record<string, unknown>,
  fields: Record<string, string | string[]>
): boolean {
  return Object.entries(fields).every(([key, value]) => {
    if (Array.isArray(value))
      return !value.length || (Array.isArray(baseline[key]) && baseline[key].length > 0);
    return !value.trim() || (typeof baseline[key] === 'string' && baseline[key].trim().length > 0);
  });
}
