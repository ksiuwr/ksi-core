import { writable } from 'svelte/store';

type PastUser = {
  username: string;
  avatarUrl: string;
  lastLoggedInDate: Date;
};

function createPastUsersStore() {
  const { subscribe, set, update } = writable<PastUser[]>([]);

  const forgetUser = (username: string) => {
    update((users) => users.filter((u) => u.username !== username));
  };

  const forgetAll = () => {
    set([]);
  };

  const internalSet = (value: PastUser[]) => {
    set(value);
  };

  return {
    subscribe,
    set: internalSet,
    forgetUser,
    forgetAll
  };
}

export const pastUsersStore = createPastUsersStore();
