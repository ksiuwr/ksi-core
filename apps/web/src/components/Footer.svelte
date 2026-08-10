<script lang="ts">
  import {
    ArrowUpRight,
    ChevronDown,
    Facebook,
    GitCommitHorizontal,
    Github,
    Instagram,
    Linkedin,
    Mail
  } from '@lucide/svelte';
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

  // @wc-ignore
  const socialLinks = [
    { label: 'GitHub', href: 'https://github.com/ksiuwr', icon: Github },
    { label: 'Instagram', href: 'https://instagram.com/ksi_uwr', icon: Instagram },
    { label: 'Facebook', href: 'https://www.facebook.com/ksi.uwr', icon: Facebook },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/ksiuwr/', icon: Linkedin }
  ];
</script>

<footer
  class="border-base-content/15 bg-base-50 text-base-content w-full border-t px-4 sm:px-6 lg:px-12"
>
  <div class="mx-auto max-w-7xl">
    <div class="grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-end lg:py-16">
      <div>
        <p class="text-primary mb-4 text-xs font-bold tracking-[0.2em] uppercase">Get in touch</p>
        <h2 class="mb-0! max-w-2xl text-3xl tracking-tight md:text-5xl">
          Have an idea worth exploring?
        </h2>
      </div>

      <a
        href="mailto:ksi@cs.uni.wroc.pl"
        class="group border-base-content/30 hover:border-primary hover:text-primary flex w-fit items-center gap-3 border-b pb-2 text-sm font-bold transition-colors"
      >
        <Mail class="size-4" />
        ksi@cs.uni.wroc.pl
        <ArrowUpRight
          class="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </a>
    </div>

    <div class="border-base-content/15 grid border-t lg:grid-cols-[1.2fr_0.8fr_1fr]">
      <div class="lg:border-base-content/15 py-10 lg:border-r lg:pr-10">
        <a href="/" class="hover:text-primary inline-block text-xl font-bold tracking-[-0.04em]">
          KSI UWr
        </a>
        <p class="text-base-content/60 mt-4 max-w-sm text-sm leading-relaxed">
          Computer Science Students’ Association at the University of Wrocław.
        </p>
        <address class="text-base-content/45 mt-6 text-xs leading-relaxed not-italic">
          Institute of Computer Science<br />
          15 Fryderyka Joliot-Curie St.<br />
          50-383 Wrocław · Room 24
        </address>
      </div>

      <nav
        aria-label="Footer navigation"
        class="border-base-content/15 lg:border-base-content/15 border-t py-10 lg:border-t-0 lg:border-r lg:px-10"
      >
        <p class="text-base-content/40 mb-5 text-xs font-bold tracking-[0.18em] uppercase">
          Explore
        </p>
        <ul class="space-y-3 text-sm">
          <li><a href="/#about" class="hover:text-primary transition-colors">About us</a></li>
          <li><a href="/projects" class="hover:text-primary transition-colors">Projects</a></li>
          <li>
            <a href="mailto:ksi@cs.uni.wroc.pl" class="hover:text-primary transition-colors"
              >Contact</a
            >
          </li>
        </ul>
      </nav>

      <div class="border-base-content/15 border-t py-10 lg:border-t-0 lg:pl-10">
        <p class="text-base-content/40 mb-5 text-xs font-bold tracking-[0.18em] uppercase">
          Find us online
        </p>
        <div class="border-base-content/15 grid grid-cols-2 border-t border-l">
          {#each socialLinks as social (social.label)}
            <a
              href={social.href}
              target="_blank"
              rel="noreferrer"
              class="group border-base-content/15 hover:bg-base-200 hover:text-primary flex items-center justify-between gap-3 border-r border-b p-4 text-sm transition-colors"
            >
              <span class="flex items-center gap-3">
                <social.icon class="size-4" />
                {social.label}
              </span>
              <ArrowUpRight
                class="text-base-content/30 group-hover:text-primary size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          {/each}
        </div>
      </div>
    </div>

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
  </div>
</footer>
