<script lang="ts">
  import { showAdmin, sidebarStore } from '$lib/sidebar';
  import {
    File,
    FileIcon,
    LogIn,
    LogOut,
    Megaphone,
    PanelLeftClose,
    TableProperties,
    Wrench
  } from '@lucide/svelte';
  import type { User, Session } from '@ksi-core/server/lib/auth.types';
  import { authClient } from '../lib/auth-client';
  import { api } from '$lib/backend';
  import { toast } from 'svelte-sonner';
  import { editions } from '$lib/data/conferences.js';
  import SidebarAccordion from './SidebarAccordion.svelte';
  import { page } from '$app/stores';
  import SidebarLink from './SidebarLink.svelte';
  import { getUrls } from 'shared';

  interface Props {
    user: User | null;
    session: Session | null;
  }

  const { user, session }: Props = $props();

  let clicksResetDebounceTimeout: NodeJS.Timeout | null = null;

  let clicks = $state(0);
  $effect(() => {
    if (clicks >= 4 && user === null) $showAdmin = true;
    if (clicksResetDebounceTimeout !== null) {
      clearTimeout(clicksResetDebounceTimeout);
    }
    clicksResetDebounceTimeout = setTimeout(() => (clicks = 0), 5000);
  });

  $effect(() => {
    if (user !== null) {
      api.dashboard.user.get().then(async (r) => {
        if (r.error) {
          await authClient.signOut();
          toast.error('Access denied.', {
            id: 'access_denied'
          });
          return;
        }
      });
    }
  });

  $effect(() => {
    if ($page.url.pathname) {
      $sidebarStore = false;
    }
  });
</script>

{#snippet sidebarContent()}
  <div class="flex flex-col flex-1 w-full py-4 overflow-y-auto">
    <div
      role="presentation"
      onclick={() => {
        clicks++;
      }}
      class="px-6 pb-2 text-xs font-bold uppercase tracking-wider text-base-content/40 cursor-default select-none hover:text-base-content/60 transition-colors"
    >
      Navigation tree
    </div>

    <SidebarLink href="/" icon={File}>Home</SidebarLink>

    <SidebarAccordion title="zosia">
      <SidebarLink href="/zosia" icon={FileIcon}>README</SidebarLink>
      {#each Object.keys(editions).sort((a, b) => parseInt(b) - parseInt(a)) as edition}
        <SidebarLink href={`/zosia/${edition}`}>{edition}</SidebarLink>
      {/each}
    </SidebarAccordion>

    <SidebarAccordion title="projects">
      <SidebarLink href="/projects/hoc" icon={FileIcon} exact={false}>hour-of-code</SidebarLink>
      <SidebarLink href="/projects/ket" icon={FileIcon} exact={false}>ket</SidebarLink>
      <SidebarAccordion title="machine-learning">
        <SidebarLink href="/projects/physarum" icon={FileIcon} exact={false}>physarum</SidebarLink>
        <SidebarLink href="/projects/krasnal" icon={FileIcon} exact={false}>krasnal</SidebarLink>
      </SidebarAccordion>
    </SidebarAccordion>

    <div class="flex flex-col w-full">
      {#if $showAdmin}
        <div class="my-4 h-px bg-base-200 mx-6"></div>
        <div class="px-6 pb-2 text-xs font-bold uppercase tracking-wider text-base-content/40">
          Admin
        </div>
        <button
          onclick={() => {
            authClient.signIn.social({
              provider: 'discord',
              callbackURL: getUrls().FRONTEND + '/dashboard'
            });
          }}
          class="text-error font-bold flex items-center gap-3 font-mono text-sm w-full py-1.5 px-6 hover:bg-base-200 cursor-pointer text-left"
        >
          <LogIn class="size-4" />
          Login
        </button>
      {/if}

      {#if session !== null}
        <div class="pt-4">
          <div class="w-full px-4 py-2 my-2 border-t border-base-200 bg-base-200/30">
            <div class="flex items-center w-full justify-between px-2">
              <div class="flex flex-col">
                <span class="text-xs opacity-50">Logged in as</span>
                <span class="text-sm font-bold text-primary truncate max-w-30">
                  {user?.name}
                </span>
              </div>
              <button
                type="button"
                onclick={() => {
                  authClient.signOut();
                }}
                class="btn btn-ghost btn-sm btn-square text-error"
                title="Logout"
              >
                <LogOut class="size-4" />
              </button>
            </div>
          </div>

          <SidebarAccordion title="dashboard">
            <SidebarLink href="/dashboard" icon={Wrench}>HOME</SidebarLink>
            <SidebarLink href="/dashboard/alerts" icon={Megaphone}>ALERTS</SidebarLink>
            <SidebarLink href="/dashboard/s3cache" icon={TableProperties}>S3 CACHE</SidebarLink>
          </SidebarAccordion>
        </div>
      {/if}
    </div>
  </div>
{/snippet}

<aside
  class="hidden lg:flex w-62.5 shrink-0 flex-col border-r border-base-200 bg-base-100 sticky top-15 h-[calc(100vh-60px)]"
>
  {@render sidebarContent()}
</aside>

<div
  class="fixed top-0 left-0 h-screen flex flex-col z-50 lg:hidden shadow-2xl transition-transform duration-300 ease-out {$sidebarStore
    ? 'translate-x-0'
    : '-translate-x-full'}"
>
  <div class="flex h-15 items-center border-b border-r border-base-200 bg-base-100">
    <button
      onclick={() => {
        $sidebarStore = false;
      }}
      class="btn btn-square btn-outline h-15 w-15 rounded-none border-0 border-r border-base-200"
    >
      <PanelLeftClose class="size-5" />
    </button>
    <span class="ml-4 font-mono text-lg font-bold">Navigation</span>
  </div>

  <div class="bg-base-100 flex flex-col w-70 h-full overflow-hidden border-r border-base-200">
    {@render sidebarContent()}
  </div>
</div>

<div
  role="presentation"
  class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-out {$sidebarStore
    ? 'opacity-100'
    : 'opacity-0 pointer-events-none'}"
  onclick={() => ($sidebarStore = false)}
></div>
