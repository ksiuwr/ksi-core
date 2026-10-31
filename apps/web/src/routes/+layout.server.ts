import type { LayoutServerLoad } from './$types';
import type { api } from '$lib/backend';
import { backendFetch } from 'shared/server';
import { contentLocale } from 'shared/content-locales';
import { env } from '$lib/server/environment';

type Alert = NonNullable<Awaited<ReturnType<typeof api.alerts.current.get>>['data']>;

export const load: LayoutServerLoad = async (event) => {
  event.depends('ksi:alert', 'ksi:localized-content');
  let alert: Alert | null = null;
  try {
    // The backend answers 404 while no alert is scheduled.
    const response = await backendFetch(
      event,
      env,
      `/alerts/current?locale=${contentLocale(event.cookies.get('locale'))}`
    );
    if (response.ok) alert = await response.json();
  } catch {
    // no active alert
  }

  return {
    alert,
    user: event.locals.user,
    session: event.locals.session,
    dashboardOrigin: (await import('shared')).getUrls().frontend.dashboard
  };
};
