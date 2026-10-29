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

<footer class="border-line bg-surface text-ink border-t">
  <div
    class="page-container grid gap-10 py-12 sm:grid-cols-2 md:py-16 lg:grid-cols-[1.6fr_1fr_1fr]"
  >
    <div class="sm:col-span-2 lg:col-span-1">
      <a href="/" class="text-ink inline-flex items-center gap-3">
        <img src="/logo.svg" alt="" class="size-9 dark:invert" />
        <span class="font-display text-2xl font-semibold tracking-[-0.04em]">KSI UWr</span>
      </a>
      <p class="text-muted mt-4 max-w-sm text-sm leading-relaxed">
        Computer Science Students’ Association at the University of Wrocław.
      </p>
      <address class="text-muted mt-5 text-xs leading-relaxed not-italic">
        Institute of Computer Science<br />
        15 Fryderyka Joliot-Curie St.<br />
        50-383 Wrocław · Room 24
      </address>
    </div>

    <nav aria-label="Footer navigation">
      <p class="eyebrow mb-4">Explore</p>
      <ul class="space-y-2.5 text-sm">
        <li><a href="/#about" class="footer-link">About us</a></li>
        <li><a href="/projects" class="footer-link">Projects</a></li>
        <li><a href="/articles" class="footer-link">Articles</a></li>
        <li><a href="/projects/zosia" class="footer-link">ZOSIA</a></li>
        <li><a href="mailto:ksi@cs.uni.wroc.pl" class="footer-link">Contact</a></li>
      </ul>
    </nav>

    <div>
      <p class="eyebrow mb-4">Find us online</p>
      <ul class="space-y-2.5 text-sm">
        {#each socialLinks as social (social.href)}
          <li>
            <a href={social.href} target="_blank" rel="noreferrer" class="footer-link group">
              <social.icon class="size-4" aria-hidden="true" />
              {social.label}
              <ArrowUpRight
                class="size-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-60"
                aria-hidden="true"
              />
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="border-line border-t">
    <div
      class="page-container text-muted flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4 text-xs"
    >
      <div class="flex items-center gap-3">
        <span>© KSI {new Date().getFullYear()}</span>
        <span
          class="bg-surface-muted border-line rounded-sm border px-1.5 py-0.5 font-mono text-[10px]"
          >v{import.meta.env.PUBLIC_APP_VERSION}</span
        >
      </div>
      <div class="flex items-center gap-5">
        <a
          href="https://github.com/ksiuwr/ksi-core"
          target="_blank"
          rel="noreferrer"
          class="footer-link group"
        >
          <Github class="size-3.5" aria-hidden="true" />
          Source code
        </a>
        {#if commitHash}
          <a
            href="https://github.com/ksiuwr/ksi-core/commit/{commitHash}"
            target="_blank"
            rel="noreferrer"
            class="footer-link font-mono"
            title="Commit {commitHash}"
          >
            <GitCommitHorizontal class="size-3.5" aria-hidden="true" />
            {shortCommitHash}
          </a>
        {/if}
      </div>
    </div>
  </div>
</footer>

<style>
  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    transition: color var(--dur-fast) ease;
  }
  .footer-link:hover {
    color: var(--ink);
  }
</style>
