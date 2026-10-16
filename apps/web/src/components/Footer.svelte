<script lang="ts">
  import {
    ArrowUpRight,
    Facebook,
    GitCommitHorizontal,
    Github,
    Instagram,
    Linkedin
  } from '@lucide/svelte';

  const commitHash = import.meta.env.PUBLIC_COMMIT_HASH || '';
  const shortCommitHash = commitHash.slice(0, 7);

  // @wc-ignore
  const socialLinks = [
    { label: 'GitHub', href: 'https://github.com/ksiuwr', icon: Github },
    { label: 'Instagram', href: 'https://instagram.com/ksi_uwr', icon: Instagram },
    { label: 'Facebook', href: 'https://www.facebook.com/ksi.uwr', icon: Facebook },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/ksiuwr/', icon: Linkedin }
  ];
</script>

<footer class="relative w-full" style="background: var(--surface); color: var(--ink);">
  <div class="grid grid-cols-1 md:mx-8 lg:grid-cols-3">
    <div class="border-muted lg:border-base-content/15 border-r border-dashed p-4 py-8 md:py-16">
      <a
        href="/"
        class="hover:text-primary font-anybody inline-block text-6xl font-semibold tracking-[-0.04em]"
      >
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
      class="border-muted lg:border-base-content/15 flex flex-col gap-8 border-t border-dashed px-4 py-8 md:py-16 lg:border-t-0 lg:border-r lg:px-10"
    >
      <p class="text-base-content/40 mb-5 text-xs font-bold tracking-[0.18em] uppercase">Explore</p>
      <ul class="space-y-3 text-sm">
        <li><a href="/#about" class="hover:text-primary transition-colors">About us</a></li>
        <li><a href="/projects" class="hover:text-primary transition-colors">Projects</a></li>
        <li><a href="/articles" class="hover:text-primary transition-colors">Articles</a></li>
        <li>
          <a href="/projects/zosia" class="hover:text-primary transition-colors">ZOSIA</a>
        </li>
        <li>
          <a href="mailto:ksi@cs.uni.wroc.pl" class="hover:text-primary transition-colors"
            >Contact</a
          >
        </li>
      </ul>
    </nav>

    <div
      class="border-muted flex flex-col gap-8 border-t border-dashed px-4 py-8 md:py-16 lg:border-t-0 lg:pl-10"
    >
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
    class="footer-bottom border-t border-dashed px-4 py-3 text-xs md:px-12"
    style="background: var(--surface-muted); color: var(--ink); border-color: var(--line);"
  >
    <span class="footer-copy">© KSI {new Date().getFullYear()}</span>

    <span class="footer-version font-mono" style="color: var(--muted);"
      >v{import.meta.env.PUBLIC_APP_VERSION}</span
    >

    <div class="footer-links">
      <a
        href="https://github.com/ksiuwr/ksi-core"
        target="_blank"
        rel="noreferrer"
        class="group font-anybody hover:text-primary flex items-center gap-2 transition-colors"
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
          class="group hover:text-primary flex items-center gap-1.5 font-mono transition-colors"
          title="Commit {commitHash}"
        >
          <GitCommitHorizontal class="size-3.5" />
          <span>{shortCommitHash}</span>
        </a>
      {/if}
    </div>
  </div>
</footer>

<style>
  .footer-bottom {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
    column-gap: 12px;
    row-gap: 12px;
  }
  .footer-copy {
    grid-column: 1 / -1;
    justify-self: center;
  }
  .footer-version {
    grid-column: 1;
    grid-row: 2 / span 2;
  }
  .footer-links {
    grid-column: 2;
    grid-row: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }
  @media (min-width: 640px) {
    .footer-bottom {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .footer-copy,
    .footer-version,
    .footer-links {
      grid-column: auto;
      grid-row: auto;
    }
    .footer-links {
      margin-left: auto;
      flex-direction: row;
      align-items: center;
      gap: 24px;
    }
  }
</style>
