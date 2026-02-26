import { treaty } from '@elysiajs/eden'
import { getUrls } from 'shared';
import type { App } from "shared/eden"


export const api = treaty<App>(getUrls().BACKEND, {
  fetch: {
    credentials: "include",
  },
});

export const resolveError = (
  error: unknown &
    (
      | { value: string }
      | {
        value: {
          message?: string;
        };
      }
    ),
  alternativeError?: string,
): string => {
  return typeof error.value === 'string'
    ? error.value
    : error.value.message || (alternativeError ?? 'Wystąpił nieznany błąd.');
}
