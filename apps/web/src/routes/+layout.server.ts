import { api } from '$lib/backend';

export const load = async () => {
  try {
    const alert = await api.alerts.current.get();
    return { alert: alert.data };
  } catch {
    return { alert: null };
  }
};
