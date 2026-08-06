<script lang="ts">
  import ThemeButton from './ThemeButton.svelte';
  import { ChevronDown, ChevronUp, LogIn, LogOut, Menu, X } from '@lucide/svelte';
  import { sidebarStore } from '$lib/sidebar';
  import { locale, setLocale } from '$lib/locale.svelte';
  import { locales, type Locale } from '../locales/data';
  import { authClient } from '$lib/auth-client';
  import { getUrls } from 'shared';
  import NavbarAccordion from './NavbarAccordion.svelte';
  import type { User, Session } from '@ksi-core/server/lib/auth.types';
  import { toast } from 'svelte-sonner';
  import { afterNavigate, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';

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

  // FAB state: true = user is at the very top (show chevron-down), false = scrolled past navbar (show menu)
  let preNavbarVisible = $state(false);

  $effect(() => {
    function updateFabState() {
      const navbar = document.getElementById('navbar');
      if (!navbar) return;
      preNavbarVisible = window.scrollY < navbar.offsetTop;
    }
    updateFabState();
    window.addEventListener('scroll', updateFabState, { passive: true });
    return () => window.removeEventListener('scroll', updateFabState);
  });

  afterNavigate(() => {
    const navbar = document.getElementById('navbar');
    window.scrollTo({ top: navbar?.offsetTop ?? 0, behavior: 'instant' });
  });

  function scrollToNavbar() {
    const navbar = document.getElementById('navbar');
    window.scrollTo({ top: navbar?.offsetTop ?? 0, behavior: 'smooth' });
  }
</script>

{#snippet zosiaEditions()}
  <div class="flex h-full w-full gap-2 p-2">
    <a
      href="/projects/zosia/2026"
      class="group/year hover:text-base-content bg-base-300 rounded-box flex flex-1 flex-col overflow-hidden p-4 transition-all duration-700 ease-in-out hover:flex-[10] hover:bg-blue-500"
    >
      <h3
        class="text-base-content m-0 text-lg font-bold transition-all duration-700 ease-in-out group-hover/year:text-4xl"
      >
        2026
      </h3>

      <div
        class="mt-2 w-[300px] opacity-0 transition-opacity duration-700 group-hover/year:opacity-100"
      >
        <p class="text-sm">Date: 05.03.2026 - 08.03.2026</p>
        <p class="text-sm">Number of participants: 274</p>
      </div>
    </a>

    <a
      href="/projects/zosia/2025"
      class="group/year hover:text-base-content bg-base-300 rounded-box flex flex-1 flex-col overflow-hidden p-4 transition-all duration-700 ease-in-out hover:flex-[10] hover:bg-blue-500"
    >
      <h3
        class="text-base-content m-0 text-lg font-bold transition-all duration-700 ease-in-out group-hover/year:text-4xl"
      >
        2025
      </h3>
      <div
        class="mt-2 w-[300px] opacity-0 transition-opacity duration-700 group-hover/year:opacity-100"
      >
        <p class="text-sm">Date: 28.02.2025 - 03.03.2025</p>
        <p class="text-sm">Number of participants: 217</p>
      </div>
    </a>

    <a
      href="/projects/zosia/2024"
      class="group/year hover:text-base-content bg-base-300 rounded-box flex flex-1 flex-col overflow-hidden p-4 transition-all duration-700 ease-in-out hover:flex-[10] hover:bg-blue-500"
    >
      <h3
        class="text-base-content m-0 text-lg font-bold transition-all duration-700 ease-in-out group-hover/year:text-4xl"
      >
        2024
      </h3>
      <div
        class="mt-2 w-[300px] opacity-0 transition-opacity duration-700 group-hover/year:opacity-100"
      >
        <p class="text-sm">Date: 22.02.2024 - 25.02.2024</p>
        <p class="text-sm">Number of participants: 263</p>
      </div>
    </a>
  </div>
{/snippet}

{#snippet machineLearning()}
  <div class="flex h-full w-full gap-2 p-2">
    <a
      href="/projects/ml/krasnal"
      class="group/year hover:text-base-content bg-base-300 rounded-box flex flex-1 flex-col overflow-hidden p-4 transition-all duration-700 ease-in-out hover:flex-[10] hover:bg-blue-500"
    >
      <h3
        class="text-base-content m-0 text-lg font-bold transition-all duration-700 ease-in-out group-hover/year:text-4xl"
      >
        Krasnal
      </h3>

      <div
        class="mt-2 w-[800px] opacity-0 transition-opacity duration-700 group-hover/year:opacity-100"
      >
        <p>
          Krasnal is a chess engine developed in Wrocław, based on the Transformer architecture. It
          utilizes deep neural networks to learn to play chess intuitively, departing from
          traditional, heavy calculations and game tree searching.
        </p>
      </div>
    </a>

    <a
      href="/projects/ml/physarum"
      class="group/year hover:text-base-content bg-base-300 rounded-box flex flex-1 flex-col overflow-hidden p-4 transition-all duration-700 ease-in-out hover:flex-[10] hover:bg-blue-500"
    >
      <h3
        class="text-base-content m-0 text-lg font-bold transition-all duration-700 ease-in-out group-hover/year:text-4xl"
      >
        Physarum
      </h3>
      <div
        class="mt-2 w-[600px] opacity-0 transition-opacity duration-700 group-hover/year:opacity-100"
      >
        <p>
          Can a Slime Mold train Neural Networks? It turns out to be a fascinating subject,
          intersecting the computational biology and AI.
        </p>
      </div>
    </a>
  </div>
{/snippet}

<div class="bg-base-200 w-full px-4 not-lg:hidden sm:px-6 lg:px-12">
  <div class="mx-auto flex w-full flex-col gap-8 py-10 lg:max-w-7xl">
    <h1 class="uppercase">Projects</h1>
    <NavbarAccordion title="Zosia" url="/projects/zosia" content={zosiaEditions} />
    <NavbarAccordion title="Machine Learning" url="/projects/ml" content={machineLearning} />
    <a href="/projects" class="w-max cursor-pointer underline">and more...</a>

    <div class="flex items-center justify-end gap-8">
      <div class="dropdown dropdown-bottom">
        <div
          tabindex="0"
          role="button"
          class="text-muted hover:text-base-content flex cursor-pointer items-center gap-2 text-sm uppercase transition-colors duration-150"
        >
          <span class="select-none">{activeLocale.emoji} {activeLocale.formattedLocale}</span>
          <ChevronDown class="size-4" />
        </div>

        <ul
          class="dropdown-content menu bg-base-200 text-base-content right-0 z-99 mt-2 w-60 border p-2 shadow"
        >
          {#each availableLocales as loc}
            <li>
              <button
                class:active={locale.current === loc.code}
                onclick={() => setLocale(loc.code)}
                class={[
                  'items-centers flex gap-2 rounded-none py-2 font-semibold uppercase',

                  locale.current === loc.code
                    ? 'text-base-content bg-blue-600'
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
      {#if session && user}
        <div class="flex gap-4">
          <a
            href="/dashboard"
            class="text-muted hover:text-base-content flex items-center gap-4 text-sm"
          >
            {#if user.image}
              <img
                src={user.image}
                class="size-6 rounded-full"
                alt={`${user.name}'s profile picture`}
              />
            {/if}
            {user.name}
          </a>
          <button
            class="btn btn-circle text-error"
            onclick={async () => {
              const r = await authClient.signOut();
              if (r.data?.success) {
                toast.success('Logged out');
                await invalidateAll();
              }
            }}
          >
            <LogOut class="size-4 shrink-0" />
          </button>
        </div>
      {:else}
        <button
          onclick={() => {
            authClient.signIn.social({
              provider: 'discord',
              callbackURL: getUrls().FRONTEND + '/dashboard'
            });
          }}
          class="hover:text-error group text-muted flex cursor-pointer items-center text-left font-mono text-sm uppercase"
        >
          <LogIn class="size-4 shrink-0" />

          <div
            class="max-w-0 overflow-hidden transition-all duration-450 ease-out group-hover:max-w-54"
          >
            <div class="pl-3 whitespace-nowrap">Member access</div>
          </div>
        </button>
      {/if}
    </div>
  </div>
</div>

<header
  id="navbar"
  class="border-b-base-200 bg-base-100/95 sticky top-0 z-40 flex h-18 w-full border-b backdrop-blur-sm lg:px-12"
>
  <div class="mx-auto flex w-full flex-row items-center justify-between lg:max-w-7xl">
    <!-- Left: mobile toggle + logo + site name -->
    <div class="flex h-full items-center">
      <!-- Mobile dual-purpose button -->
      <button
        onclick={() => {
          if (preNavbarVisible) {
            scrollToNavbar();
          } else {
            $sidebarStore = !$sidebarStore;
          }
        }}
        class="btn btn-square btn-ghost border-base-200 h-18 w-18 rounded-none border-r lg:hidden"
        aria-label={preNavbarVisible ? 'Scroll to content' : 'Toggle sidebar'}
      >
        <div class="relative size-5">
          <span
            class="absolute inset-0 flex items-center justify-center transition-all duration-200 {preNavbarVisible
              ? 'scale-100 opacity-100'
              : 'scale-75 opacity-0'}"
          >
            <ChevronDown class="size-5" />
          </span>
          <span
            class="absolute inset-0 flex items-center justify-center transition-all duration-200 {preNavbarVisible
              ? 'scale-75 opacity-0'
              : 'scale-100 opacity-100'}"
          >
            <Menu class="size-5" />
          </span>
        </div>
      </button>

      <a
        href="/"
        class="hover:bg-base-200/50 lg:border-base-200 flex h-full items-center gap-3 px-4 font-mono opacity-80 transition-all duration-150 hover:opacity-100 lg:border-r lg:pr-6"
      >
        <img src="/logo.svg" alt="" class="size-10 shrink-0 dark:invert" />
        <span class="text-lg tracking-tight not-lg:hidden">KSI</span>
      </a>

      <nav class="flex h-full items-center not-lg:hidden">
        <a
          href="/"
          class="text-base-content/60 hover:text-base-content border-base-200 hover:bg-base-200/40 flex h-full items-center border-r px-5 text-sm font-medium transition-colors duration-150 {$page
            .url.pathname === '/'
            ? 'text-base-content bg-base-200/30'
            : ''}"
        >
          Home
        </a>
        <a
          href="/projects"
          class="text-base-content/60 hover:text-base-content border-base-200 hover:bg-base-200/40 flex h-full items-center border-r px-5 text-sm font-medium transition-colors duration-150 {$page.url.pathname.startsWith(
            '/projects'
          ) || $page.url.pathname.startsWith('/zosia')
            ? 'text-base-content bg-base-200/30'
            : ''}"
        >
          Projects
        </a>
        {#if session && user}
          <a
            href="/dashboard"
            class="text-base-content/60 hover:text-base-content border-base-200 hover:bg-base-200/40 flex h-full items-center border-r px-5 text-sm font-medium transition-colors duration-150 {$page.url.pathname.startsWith(
              '/dashboard'
            )
              ? 'text-base-content bg-base-200/30'
              : ''}"
          >
            Dashboard
          </a>
        {/if}
      </nav>
    </div>

    <button
      onclick={() => {
        if (preNavbarVisible) {
          document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
      class="btn btn-ghost border-base-200 relative h-18 w-18 rounded-none border-y-0 border-r-0 border-l not-lg:hidden"
      aria-label={preNavbarVisible ? 'Scroll to content' : 'Scroll to top'}
    >
      <div class="relative size-5">
        <span
          class="absolute inset-0 flex items-center justify-center transition-all duration-200 {preNavbarVisible
            ? 'scale-100 opacity-100'
            : 'scale-75 opacity-0'}"
        >
          <ChevronDown class="size-5" />
        </span>
        <span
          class="absolute inset-0 flex items-center justify-center transition-all duration-200 {preNavbarVisible
            ? 'scale-75 opacity-0'
            : 'scale-100 opacity-100'}"
        >
          <ChevronUp class="size-5" />
        </span>
      </div>
      <span
        class="bg-primary absolute top-3 right-3 size-1.5 rounded-full transition-all duration-300 {preNavbarVisible
          ? 'scale-0 opacity-0'
          : 'scale-100 opacity-100'}"
      ></span>
    </button>
  </div>
</header>
