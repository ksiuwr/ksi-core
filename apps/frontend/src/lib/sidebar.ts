import { writable } from "svelte/store";

export const sidebarStore = writable(false);

export const showAdmin = writable(false);