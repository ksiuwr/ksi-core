import { error } from '@sveltejs/kit';
import { platform } from '$lib/server/platform';
import type { AssociationAlert } from 'shared/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { canManageAlerts } = await event.parent();
  if (!canManageAlerts) error(403, 'Access denied');
  const page = Number(event.url.searchParams.get('page') ?? 0);
  if (!Number.isSafeInteger(page) || page < 0) error(400, 'Invalid page');
  const alerts = await platform<{ results: AssociationAlert[]; pages: number }>(
    event,
    `/dashboard/admin/alerts?page=${page}`
  );
  return { alerts, alertPage: page, title: 'Settings', tab: 'settings' };
};
