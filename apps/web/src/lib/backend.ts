import { treaty } from '@elysiajs/eden';
import { getUrls } from 'shared';
import type { App } from 'shared/eden';

export const api = treaty<App>(getUrls().BACKEND, {
  fetch: {
    credentials: 'include'
  }
});

export const makeApi = (fetcher: typeof fetch) =>
  treaty<App>(getUrls().BACKEND, {
    fetch: {
      credentials: 'include'
    },
    fetcher: fetcher
  });

export const resolveError = (
  error:
    | { value: string }
    | {
        value: {
          message?: string;
        };
      },
  alternativeError?: string
): string => {
  return typeof error.value === 'string'
    ? error.value
    : error.value.message || (alternativeError ?? 'Wystąpił nieznany błąd.');
};
