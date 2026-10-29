import { treaty } from '@elysiajs/eden';
import type { App } from 'shared/eden';

export const api = treaty<App>('/api', {
  fetch: {
    credentials: 'include'
  }
});

export const resolveError = (
  error: { value: string | { message?: string; code?: string } },
  alternativeError?: string
): string => {
  return typeof error.value === 'string'
    ? error.value
    : error.value.message || error.value.code || (alternativeError ?? 'Wystąpił nieznany błąd.');
};
