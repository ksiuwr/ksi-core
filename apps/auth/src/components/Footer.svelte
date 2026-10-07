<script lang="ts">
  import { ArrowUpRight, ChevronDown, GitCommitHorizontal, Github } from '@lucide/svelte';
  import { locale, setLocale } from '$lib/locale.svelte';
  import { locales } from '../locales/data';

  const commitHash = import.meta.env.PUBLIC_COMMIT_HASH || '';
  const shortCommitHash = commitHash.slice(0, 7);

  const availableLocales = $derived(
    locales
      .map((localeCode) => ({
        code: localeCode,
        emoji: getFlagEmoji(localeCode),
        formattedLocale: new Intl.DisplayNames([localeCode], { type: 'language' }).of(localeCode)!
      }))
      .toSorted((a, b) => a.formattedLocale.localeCompare(b.formattedLocale))
  );

  const activeLocale = $derived(
    availableLocales.find((availableLocale) => availableLocale.code === locale.current) ??
      availableLocales[0]
  );

  function getFlagEmoji(localeCode: string) {
    const countryCode = localeCode.includes('-') ? localeCode.split('-')[1] : localeCode;
    return [...countryCode.toUpperCase()]
      .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
      .join('');
  }
</script>

<footer class="text-base-content absolute bottom-0 w-full">
  <div
    class="border-base-content/15 text-base-content/40 flex flex-col items-center gap-3 border-t py-5 text-xs sm:flex-row sm:justify-between"
  >
    <span>© KSI {new Date().getFullYear()}</span>

    <div class="flex flex-wrap items-center gap-x-6 gap-y-3 not-sm:w-full">
      <div class="dropdown dropdown-top dropdown-end not-sm:w-full">
        <button
          type="button"
          tabindex="0"
          aria-label="Change language"
          class="hover:text-primary flex items-center justify-center gap-2 uppercase transition-colors not-sm:w-full"
        >
          <span aria-hidden="true">{activeLocale.emoji}</span>
          <span>{activeLocale.formattedLocale}</span>
          <ChevronDown class="size-3.5 rotate-180" />
        </button>

        <ul
          tabindex="-1"
          class="dropdown-content menu border-base-content/15 bg-base-100 text-base-content z-50 mb-3 w-56 border p-2 shadow-lg not-sm:w-full"
        >
          {#each availableLocales as availableLocale (availableLocale.code)}
            <li>
              <button
                type="button"
                onclick={() => setLocale(availableLocale.code)}
                class={[
                  'flex gap-3 rounded-none py-2 uppercase',
                  locale.current === availableLocale.code
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-200'
                ]}
              >
                <span aria-hidden="true">{availableLocale.emoji}</span>
                {availableLocale.formattedLocale}
              </button>
            </li>
          {/each}
        </ul>
      </div>

      <a
        href="https://github.com/ksiuwr/ksi-core"
        target="_blank"
        rel="noreferrer"
        class="group hover:text-primary flex w-full items-center justify-center gap-2 transition-colors sm:w-fit"
      >
        <Github class="size-3.5" />
        Source code
        <ArrowUpRight
          class="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </a>

      {#if commitHash}
        <a
          href="https://github.com/ksiuwr/ksi-core/commit/{commitHash}"
          target="_blank"
          rel="noreferrer"
          class="group hover:text-primary flex w-full items-center justify-center gap-1.5 font-mono transition-colors sm:w-fit"
          title="Commit {commitHash}"
        >
          <GitCommitHorizontal class="size-3.5" />
          <span>{shortCommitHash}</span>
        </a>
      {/if}
    </div>
  </div>
</footer>
