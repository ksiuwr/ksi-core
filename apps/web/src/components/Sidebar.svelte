<script lang="ts">
  import { showAdmin, sidebarStore } from '$lib/sidebar';
  import {
    ChevronDown,
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
  import ThemeButton from './ThemeButton.svelte';
  import { locale, setLocale } from '$lib/locale.svelte';
  import { locales } from '../locales/data';

  interface Props {
    user: User | null;
    session: Session | null;
  }

  const { user, session }: Props = $props();

  let availableLocales = $derived(
    locales
      .map((locale) => ({
        code: locale,
        emoji: getFlagEmoji(locale),
        formattedLocale: new Intl.DisplayNames([locale], { type: 'language' }).of(locale)!
      }))
      .toSorted((a, b) => a.formattedLocale.localeCompare(b.formattedLocale))
  );
  let activeLocale = $derived(
    availableLocales.find((l) => l.code === locale.current) || availableLocales[0]
  );

  function getFlagEmoji(countryCode: string) {
    if (countryCode.includes('-')) return getFlagEmoji(countryCode.split('-')[1]);
    return [...countryCode.toUpperCase()]
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  }

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
  <div class="flex flex-col flex-1 w-full gap-2 py-4 overflow-y-auto text-center">
    <SidebarLink href="/" icon={File}>Home</SidebarLink>

    <SidebarAccordion title="Zosia">
      <SidebarLink href="/zosia">Project's site</SidebarLink>
      {#each Object.keys(editions).sort((a, b) => parseInt(b) - parseInt(a)) as edition}
        <SidebarLink href={`/zosia/${edition}`}>{edition}</SidebarLink>
      {/each}
    </SidebarAccordion>

    <SidebarAccordion title="Projects">
      <SidebarLink href="/projects/hoc" icon={FileIcon} exact={false}>Hour of Code</SidebarLink>
      <SidebarLink href="/projects/ket" icon={FileIcon} exact={false}>KET</SidebarLink>
      <SidebarAccordion title="Machine Learning">
        <SidebarLink href="/projects/ml" icon={FileIcon} exact={false}>Project's site</SidebarLink>
        <SidebarLink href="/projects/ml/physarum" icon={FileIcon} exact={false}
          >physarum</SidebarLink
        >
        <SidebarLink href="/projects/ml/krasnal" icon={FileIcon} exact={false}>krasnal</SidebarLink>
      </SidebarAccordion>
    </SidebarAccordion>

    <div class="flex flex-col w-full">
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

          <SidebarAccordion title="Dashboard">
            <SidebarLink href="/dashboard" icon={Wrench}>HOME</SidebarLink>
            <SidebarLink href="/dashboard/alerts" icon={Megaphone}>ALERTS</SidebarLink>
            <SidebarLink href="/dashboard/s3cache" icon={TableProperties}>S3 CACHE</SidebarLink>
          </SidebarAccordion>
        </div>
      {/if}
    </div>

    <div class="dropdown dropdown-bottom">
      <div
        tabindex="0"
        role="button"
        class="btn btn-lg hover:text-base-content transition-colors duration-150 flex items-center gap-2 cursor-pointer capitalize"
      >
        <span class="select-none">{activeLocale.emoji} {activeLocale.formattedLocale}</span>
        <ChevronDown class="size-4" />
      </div>

      <ul
        class="dropdown-content right-0 rounded-md w-full menu bg-base-200 border-muted border text-base-content z-99 p-2 shadow mt-2"
      >
        {#each availableLocales as loc}
          <li>
            <button
              class:active={locale.current === loc.code}
              onclick={() => setLocale(loc.code)}
              class={[
                'btn flex items-centers w-full py-2 gap-2 capitalize font-semibold',

                locale.current === loc.code
                  ? 'text-base-content bg-blue-400'
                  : 'text-muted-100 hover:bg-base-300'
              ]}
            >
              {loc.emoji}
              {loc.formattedLocale}
            </button>
          </li>
        {/each}
      </ul>
    </div>
    <ThemeButton />
    <button
      onclick={() => {
        authClient.signIn.social({
          provider: 'discord',
          callbackURL: getUrls().FRONTEND + '/dashboard'
        });
      }}
      class="text-error btn btn-lg group uppercase flex items-center font-mono text-sm cursor-pointer text-left"
    >
      <LogIn class="size-4 shrink-0" />

      <div class="pl-3 whitespace-nowrap">Member access</div>
    </button>
  </div>
{/snippet}

<div
  class="fixed top-0 left-0 h-screen w-full flex flex-col z-50 lg:hidden shadow-2xl transition-transform duration-300 ease-out {$sidebarStore
    ? 'translate-x-0'
    : '-translate-x-full'}"
>
  <div class="flex h-20 items-center border-b border-r border-base-200 bg-base-100">
    <button
      onclick={() => {
        $sidebarStore = false;
      }}
      class="btn btn-square btn-outline size-20 rounded-none border-0 border-r border-base-200"
    >
      <PanelLeftClose class="size-5" />
    </button>
    <span class="ml-4 font-mono text-lg font-bold">Navigation</span>
  </div>

  <div class="bg-base-100 flex flex-col w-full h-full overflow-hidden border-r border-base-200">
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
