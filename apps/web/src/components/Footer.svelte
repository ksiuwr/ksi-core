<script lang="ts">
  import {
    ArrowUpRight,
    ChevronDown,
    Facebook,
    Github,
    Instagram,
    Linkedin,
    Mail
  } from '@lucide/svelte';
  import { locale, setLocale } from '$lib/locale.svelte';
  import { locales } from '../locales/data';

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
  class="w-full border-t border-base-content/15 px-4 sm:px-6 lg:px-12 bg-base-50 text-base-content"
>
  <div class="mx-auto max-w-7xl">
    <div class="grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-end lg:py-16">
      <div>
        <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">Get in touch</p>
        <h2 class="mb-0! max-w-2xl text-3xl tracking-tight md:text-5xl">
          Have an idea worth exploring?
        </h2>
      </div>

      <a
        href="mailto:ksi@cs.uni.wroc.pl"
        class="group flex w-fit items-center gap-3 border-b border-base-content/30 pb-2 text-sm font-bold transition-colors hover:border-primary hover:text-primary"
      >
        <Mail class="size-4" />
        ksi@cs.uni.wroc.pl
        <ArrowUpRight
          class="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </a>
    </div>

    <div class="grid border-t border-base-content/15 lg:grid-cols-[1.2fr_0.8fr_1fr]">
      <div class="py-10 lg:border-r lg:border-base-content/15 lg:pr-10">
        <a href="/" class="inline-block text-xl font-bold tracking-[-0.04em] hover:text-primary">
          KSI UWr
        </a>
        <p class="mt-4 max-w-sm text-sm leading-relaxed text-base-content/60">
          Computer Science Students’ Association at the University of Wrocław.
        </p>
        <address class="mt-6 not-italic text-xs leading-relaxed text-base-content/45">
          Institute of Computer Science<br />
          15 Fryderyka Joliot-Curie St.<br />
          50-383 Wrocław · Room 24
        </address>
      </div>

      <nav
        aria-label="Footer navigation"
        class="border-t border-base-content/15 py-10 lg:border-r lg:border-t-0 lg:border-base-content/15 lg:px-10"
      >
        <p class="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-base-content/40">
          Explore
        </p>
        <ul class="space-y-3 text-sm">
          <li><a href="/#about" class="transition-colors hover:text-primary">About us</a></li>
          <li><a href="/projects" class="transition-colors hover:text-primary">Projects</a></li>
          <li>
            <a href="mailto:ksi@cs.uni.wroc.pl" class="transition-colors hover:text-primary"
              >Contact</a
            >
          </li>
        </ul>
      </nav>

      <div class="border-t border-base-content/15 py-10 lg:border-t-0 lg:pl-10">
        <p class="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-base-content/40">
          Find us online
        </p>
        <div class="grid grid-cols-2 border-l border-t border-base-content/15">
          {#each socialLinks as social (social.label)}
            <a
              href={social.href}
              target="_blank"
              rel="noreferrer"
              class="group flex items-center justify-between gap-3 border-b border-r border-base-content/15 p-4 text-sm transition-colors hover:bg-base-200 hover:text-primary"
            >
              <span class="flex items-center gap-3">
                <social.icon class="size-4" />
                {social.label}
              </span>
              <ArrowUpRight
                class="size-3.5 text-base-content/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </a>
          {/each}
        </div>
      </div>
    </div>

    <div
      class="flex flex-col gap-3 border-t border-base-content/15 py-5 text-xs text-base-content/40 sm:flex-row items-center sm:justify-between"
    >
      <span>© KSI {new Date().getFullYear()}</span>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 not-sm:w-full">
        <div class="dropdown dropdown-top dropdown-end not-sm:w-full">
          <button
            type="button"
            tabindex="0"
            aria-label="Change language"
            class="flex not-sm:w-full items-center justify-center gap-2 uppercase transition-colors hover:text-primary"
          >
            <span aria-hidden="true">{activeLocale.emoji}</span>
            <span>{activeLocale.formattedLocale}</span>
            <ChevronDown class="size-3.5 rotate-180" />
          </button>

          <ul
            tabindex="-1"
            class="dropdown-content not-sm:w-full menu z-50 mb-3 w-56 border border-base-content/15 bg-base-100 p-2 text-base-content shadow-lg"
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
          class="group flex w-full sm:w-fit justify-center items-center gap-2 transition-colors hover:text-primary"
        >
          <Github class="size-3.5" />
          Source code
          <ArrowUpRight
            class="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
      </div>
    </div>
  </div>
</footer>
