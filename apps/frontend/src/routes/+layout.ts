import { api } from "$lib/backend";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const alert = await api.alerts.current.get();

    return { alert: alert.data };
}