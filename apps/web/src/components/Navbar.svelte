<script lang="ts">
  import ThemeButton from './ThemeButton.svelte';
  import { ChevronDown, LogIn, PanelLeft, X } from '@lucide/svelte';
  import { sidebarStore } from '$lib/sidebar';
  import { locale, setLocale } from '$lib/locale.svelte';
  import { locales, type Locale } from '../locales/data';
  import { authClient } from '$lib/auth-client';
  import { getUrls } from 'shared';
  import NavbarAccordion from './NavbarAccordion.svelte';

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
</script>

{#snippet zosiaEditions()}
  <div class="flex h-full w-full gap-2 p-2">
    <a
      href="/projects/zosia/2026"
      class="group/year flex-1 hover:flex-[10] hover:bg-blue-500 hover:text-base-content transition-all duration-700 ease-in-out bg-base-300 rounded-box p-4 flex flex-col overflow-hidden"
    >
      <h3
        class="font-bold text-lg group-hover/year:text-4xl transition-all duration-700 ease-in-out m-0 text-base-content"
      >
        2026
      </h3>

      <div
        class="opacity-0 group-hover/year:opacity-100 transition-opacity duration-700 mt-2 w-[300px]"
      >
        <p class="text-sm">Date: 05.03.2026 - 08.03.2026</p>
        <p class="text-sm">Number of participants: 274</p>
      </div>
    </a>

    <a
      href="/projects/zosia/2025"
      class="group/year flex-1 hover:flex-[10] hover:bg-blue-500 hover:text-base-content transition-all duration-700 ease-in-out bg-base-300 rounded-box p-4 flex flex-col overflow-hidden"
    >
      <h3
        class="font-bold text-lg group-hover/year:text-4xl transition-all duration-700 ease-in-out m-0 text-base-content"
      >
        2025
      </h3>
      <div
        class="opacity-0 group-hover/year:opacity-100 transition-opacity duration-700 mt-2 w-[300px]"
      >
        <p class="text-sm">Date: 28.02.2025 - 03.03.2025</p>
        <p class="text-sm">Number of participants: 217</p>
      </div>
    </a>

    <a
      href="/projects/zosia/2024"
      class="group/year flex-1 hover:flex-[10] hover:bg-blue-500 hover:text-base-content transition-all duration-700 ease-in-out bg-base-300 rounded-box p-4 flex flex-col overflow-hidden"
    >
      <h3
        class="font-bold text-lg group-hover/year:text-4xl transition-all duration-700 ease-in-out m-0 text-base-content"
      >
        2024
      </h3>
      <div
        class="opacity-0 group-hover/year:opacity-100 transition-opacity duration-700 mt-2 w-[300px]"
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
      class="group/year flex-1 hover:flex-[10] hover:bg-blue-500 hover:text-base-content transition-all duration-700 ease-in-out bg-base-300 rounded-box p-4 flex flex-col overflow-hidden"
    >
      <h3
        class="font-bold text-lg group-hover/year:text-4xl transition-all duration-700 ease-in-out m-0 text-base-content"
      >
        Krasnal
      </h3>

      <div
        class="opacity-0 group-hover/year:opacity-100 transition-opacity duration-700 mt-2 w-[800px]"
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
      class="group/year flex-1 hover:flex-[10] hover:bg-blue-500 hover:text-base-content transition-all duration-700 ease-in-out bg-base-300 rounded-box p-4 flex flex-col overflow-hidden"
    >
      <h3
        class="font-bold text-lg group-hover/year:text-4xl transition-all duration-700 ease-in-out m-0 text-base-content"
      >
        Physarum
      </h3>
      <div
        class="opacity-0 group-hover/year:opacity-100 transition-opacity duration-700 mt-2 w-[600px]"
      >
        <p>
          Can a Slime Mold train Neural Networks? It turns out to be a fascinating subject,
          intersecting the computational biology and AI.
        </p>
      </div>
    </a>
  </div>
{/snippet}

<div class="not-md:hidden flex flex-col gap-8 w-full p-10 bg-base-200">
  <h1 class="uppercase">Projects</h1>
  <NavbarAccordion title="Zosia" url="/projects/zosia" content={zosiaEditions} />
  <NavbarAccordion
    title="Machine Learning"
    url="/projects/machine-learning"
    content={machineLearning}
  />
  <a href="/projects" class="underline cursor-pointer w-max">and more...</a>

  <div class="flex gap-8 items-center justify-end">
    <div class="dropdown dropdown-bottom">
      <div
        tabindex="0"
        role="button"
        class="text-muted text-sm hover:text-base-content transition-colors duration-150 flex items-center gap-2 cursor-pointer uppercase"
      >
        <span class="select-none">{activeLocale.emoji} {activeLocale.formattedLocale}</span>
        <ChevronDown class="size-4" />
      </div>

      <ul
        class="dropdown-content right-0 menu bg-base-200 border text-base-content z-99 w-60 p-2 shadow mt-2"
      >
        {#each availableLocales as loc}
          <li>
            <button
              class:active={locale.current === loc.code}
              onclick={() => setLocale(loc.code)}
              class={[
                'flex items-centers rounded-none py-2 gap-2 uppercase font-semibold',

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
    <button
      onclick={() => {
        authClient.signIn.social({
          provider: 'discord',
          callbackURL: getUrls().FRONTEND + '/dashboard'
        });
      }}
      class="hover:text-error group uppercase flex items-center font-mono text-sm text-muted cursor-pointer text-left"
    >
      <LogIn class="size-4 shrink-0" />

      <div
        class="max-w-0 overflow-hidden transition-all duration-450 ease-out group-hover:max-w-37.5"
      >
        <div class="pl-3 whitespace-nowrap">Member access</div>
      </div>
    </button>
  </div>
</div>
<header
  class="sticky top-0 z-40 flex h-15 w-full flex-row items-center justify-between border-b border-b-base-200 bg-base-100"
>
  <div class="flex h-full items-center">
    <button
      onclick={() => {
        $sidebarStore = !$sidebarStore;
      }}
      class="btn btn-square btn-outline h-15 w-15 border-0 border-x rounded-none border-base-200 lg:hidden"
      aria-label="Toggle sidebar"
    >
      <PanelLeft class="size-5" />
    </button>

    <a
      href="/"
      class="flex size-15 justify-center items-center gap-4 font-mono text-lg opacity-80 transition-colors hover:bg-base-200/50 md:text-2xl lg:border-x lg:border-base-200"
    >
      <img src="/logo.svg" alt="" class="size-10 dark:invert md:size-12" />
    </a>
  </div>
</header>
