<script lang="ts">
  import {
    ChevronDown,
    CodeXml,
    FlaskConical,
    Github,
    LayoutDashboard,
    LogIn,
    LogOut,
    Menu,
    Mountain,
    MountainSnow,
    Newspaper,
    Share2,
    X
  } from '@lucide/svelte';
  import type { Profile as User } from 'shared/types';
  type Session = { id: string };
  import { toast } from 'svelte-sonner';
  import { afterNavigate, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { MediaQuery } from 'svelte/reactivity';
  import { tick, untrack } from 'svelte';
  import { locale, setLocale } from '$lib/locale.svelte';
  import ThemeSelector from '@ksi-core/ui/platform/ThemeSelector.svelte';
  import NavMenuPanel, { type NavMenuItem } from './ui/NavMenuPanel.svelte';

  interface Props {
    user: User | null;
    session: Session | null;
  }

  const { user, session }: Props = $props();

  // @wc-ignore
  const keys = {
    Escape: 'Escape',
    ArrowDown: 'ArrowDown'
  };

  type MenuName = 'projects' | 'groups' | 'mobile';
  let openMenu = $state<MenuName | null>(null);
  let displayedMenu = $state<MenuName>('projects');
  let header: HTMLElement = undefined as unknown as HTMLElement;
  const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
  const desktop = new MediaQuery('(min-width: 64rem)');
  const member = $derived(Boolean(session && user?.membershipStatus === 'active'));
  const loginHref = $derived(
    `/login?returnTo=${encodeURIComponent(page.url.pathname + page.url.search)}`
  );

  function toggleMenu(menu: MenuName) {
    displayedMenu = menu;
    openMenu = openMenu === menu ? null : menu;
  }

  async function handleTriggerKey(event: KeyboardEvent, menu: MenuName) {
    if (event.key !== keys.ArrowDown) return;
    event.preventDefault();
    displayedMenu = menu;
    openMenu = menu;
    await tick();
    header.querySelector<HTMLAnchorElement>('#navbar-menu a')?.focus();
  }

  function closeMenu() {
    openMenu = null;
  }

  // The desktop and mobile menus have different contents, so close on breakpoint changes.
  $effect(() => {
    void desktop.current;
    untrack(closeMenu);
  });

  afterNavigate(closeMenu);

  async function logout() {
    const response = await fetch('/logout', { method: 'POST' });
    if (response.ok) {
      toast.success('Logged out');
      closeMenu();
      await invalidateAll();
    }
  }

  const projectItems: NavMenuItem[] = [
    {
      title: 'ZOSIA',
      description: 'Our winter camp for computer science students in Lower Silesia.',
      href: '/projects/zosia',
      icon: MountainSnow,
      field: 'community'
    },
    {
      title: 'LEOSIA',
      description: 'A summer version of ZOSIA, in preparation.',
      href: '/projects',
      icon: Mountain,
      field: 'community',
      badge: 'Soon'
    },
    {
      title: 'ksi-core',
      description: 'The code behind this website.',
      href: 'https://github.com/ksiuwr/ksi-core',
      icon: Github,
      field: 'engineering',
      external: true
    }
  ];

  const groupItems: NavMenuItem[] = [
    {
      title: 'Social',
      description: 'Camps, events, and meetups.',
      href: '/projects?field=community#project-directory',
      icon: Share2,
      field: 'community'
    },
    {
      title: 'Technical',
      description: 'Software and tools built by our members.',
      href: '/projects?field=engineering#project-directory',
      icon: CodeXml,
      field: 'engineering'
    },
    {
      title: 'Scientific research',
      description: 'Paper discussions and research with faculty.',
      href: '/projects?field=research#project-directory',
      icon: FlaskConical,
      field: 'research'
    }
  ];
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === keys.Escape && openMenu) {
      const trigger = header.querySelector<HTMLButtonElement>(
        `[aria-controls="navbar-menu"][aria-expanded="true"]`
      );
      closeMenu();
      trigger?.focus();
    }
  }}
/>

{#snippet localeButton()}
  <button
    type="button"
    class="btn btn-outline btn-sm font-mono"
    aria-label="Change language"
    onclick={() => setLocale(locale.current === 'pl' ? 'en-us' : 'pl')}
    >{locale.current === 'pl' ? 'EN' : 'PL'}</button
  >
{/snippet}

{#snippet avatar()}
  {#if user?.image}
    <img src={user.image} class="size-6 rounded-full object-cover" alt="" />
  {:else}
    <span class="bg-surface-muted border-line grid size-6 place-items-center rounded-full border">
      <span class="font-mono text-[10px] uppercase">{user?.name?.[0]}</span>
    </span>
  {/if}
{/snippet}

<header
  id="navbar"
  bind:this={header}
  onfocusout={(event) => {
    if (event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) closeMenu();
  }}
  class="border-line bg-paper/80 sticky top-0 z-40 border-b backdrop-blur-md"
>
  <div class="page-container flex h-14 items-center gap-6">
    <a href="/" class="text-ink flex shrink-0 items-center gap-2.5">
      <img src="/logo.svg" alt="" class="size-7 dark:invert" />
      <span class="font-display text-lg font-semibold tracking-tight">KSI</span>
    </a>

    <nav class="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
      <button
        type="button"
        class="nav-link"
        class:current={page.url.pathname.startsWith('/projects')}
        onclick={() => toggleMenu('projects')}
        onkeydown={(event) => handleTriggerKey(event, 'projects')}
        aria-controls="navbar-menu"
        aria-expanded={openMenu === 'projects'}
      >
        Projects
        <ChevronDown class="chevron size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="nav-link"
        onclick={() => toggleMenu('groups')}
        onkeydown={(event) => handleTriggerKey(event, 'groups')}
        aria-controls="navbar-menu"
        aria-expanded={openMenu === 'groups'}
      >
        Groups
        <ChevronDown class="chevron size-3.5" aria-hidden="true" />
      </button>
      <a
        href="/articles"
        class="nav-link"
        aria-current={page.url.pathname.startsWith('/articles') ? 'page' : undefined}>Articles</a
      >
      {#if member}
        <a href={page.data.dashboardOrigin} class="nav-link">Dashboard</a>
      {/if}
    </nav>

    <div class="ml-auto hidden items-center gap-2 lg:flex">
      <ThemeSelector />
      {@render localeButton()}
      {#if member && user}
        <div class="border-line ml-1 flex items-center gap-1 border-l pl-3">
          <a
            href={page.data.dashboardOrigin}
            class="text-ink hover:bg-surface-muted flex items-center gap-2 rounded-md px-2 py-1 text-[13px] font-medium"
          >
            {@render avatar()}
            <span class="max-w-36 truncate">{user.name}</span>
          </a>
          <button type="button" class="icon-button" title="Logout" onclick={logout}>
            <LogOut class="size-4" />
          </button>
        </div>
      {:else}
        <a href={loginHref} class="btn btn-sm" data-sveltekit-reload>
          <LogIn />
          Sign in
        </a>
      {/if}
    </div>

    <button
      type="button"
      onclick={() => toggleMenu('mobile')}
      class="icon-button ml-auto lg:hidden"
      aria-label="Toggle mobile menu"
      aria-controls="navbar-menu"
      aria-expanded={openMenu === 'mobile'}
    >
      {#if openMenu === 'mobile'}<X class="size-4" />{:else}<Menu class="size-4" />{/if}
    </button>
  </div>

  <div
    id="navbar-menu"
    class="menu-reveal"
    class:menu-open={openMenu !== null}
    inert={openMenu === null}
  >
    <div class="menu-clip">
      <div class="border-line border-t">
        {#if displayedMenu === 'mobile'}
          <div
            class="page-container flex max-h-[calc(100dvh-3.5rem)] flex-col gap-5 overflow-y-auto py-5"
          >
            <div>
              <p class="eyebrow mb-2 px-2.5">Projects</p>
              <NavMenuPanel
                items={projectItems}
                compact
                moreHref="/projects"
                moreLabel="See more projects"
                onNavigate={closeMenu}
              />
            </div>
            <div>
              <p class="eyebrow mb-2 px-2.5">Groups</p>
              <NavMenuPanel items={groupItems} compact onNavigate={closeMenu} />
            </div>
            <div class="border-line grid gap-1 border-t pt-4">
              <a href="/articles" class="mobile-link" onclick={closeMenu}>
                <Newspaper class="size-4" aria-hidden="true" />
                Articles
              </a>
              {#if member}
                <a href={page.data.dashboardOrigin} class="mobile-link" onclick={closeMenu}>
                  <LayoutDashboard class="size-4" aria-hidden="true" />
                  Dashboard
                </a>
              {/if}
            </div>
            <div class="border-line flex items-center gap-2 border-t pt-4">
              <ThemeSelector />
              {@render localeButton()}
            </div>
            <div class="border-line border-t pt-4">
              {#if session && user}
                <div class="flex items-center justify-between gap-3">
                  <div class="text-ink flex min-w-0 items-center gap-2 text-sm font-medium">
                    {@render avatar()}
                    <span class="truncate">{user.name}</span>
                  </div>
                  <button type="button" class="btn btn-outline btn-sm" onclick={logout}>
                    <LogOut />
                    Logout
                  </button>
                </div>
              {:else}
                <a href={loginHref} class="btn w-full" data-sveltekit-reload>
                  <LogIn />
                  Sign in
                </a>
              {/if}
            </div>
          </div>
        {:else}
          <div class="page-container py-3">
            {#if displayedMenu === 'projects'}
              <NavMenuPanel
                items={projectItems}
                columns={4}
                moreHref="/projects"
                moreLabel="See more projects"
                onNavigate={closeMenu}
              />
            {:else}
              <NavMenuPanel items={groupItems} columns={3} onNavigate={closeMenu} />
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>

{#if openMenu}
  <div
    transition:fade={{ duration: reducedMotion.current ? 0 : 200, easing: cubicOut }}
    role="presentation"
    class="fixed inset-0 z-30 bg-black/25 backdrop-blur-[2px]"
    onclick={closeMenu}
  ></div>
{/if}

<style>
  .nav-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 10px;
    border-radius: var(--radius-md);
    color: var(--muted);
    font-size: 13px;
    font-weight: 500;
    transition:
      background-color var(--dur-fast) ease,
      color var(--dur-fast) ease;
  }
  .nav-link:hover,
  .nav-link.current,
  .nav-link[aria-current='page'],
  .nav-link[aria-expanded='true'] {
    color: var(--ink);
  }
  .nav-link:hover,
  .nav-link[aria-expanded='true'] {
    background: var(--surface-muted);
  }
  .nav-link :global(.chevron) {
    transition: rotate var(--dur) var(--ease-out);
  }
  .nav-link[aria-expanded='true'] :global(.chevron) {
    rotate: 180deg;
  }

  .mobile-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: var(--radius-lg);
    color: var(--ink);
    font-size: 14px;
    font-weight: 500;
  }
  .mobile-link:hover {
    background: var(--surface-muted);
  }
  .mobile-link :global(svg) {
    color: var(--muted);
  }

  .menu-reveal {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    visibility: hidden;
    transition:
      grid-template-rows 320ms var(--ease-out),
      opacity 200ms ease,
      visibility 320ms;
  }
  .menu-reveal.menu-open {
    grid-template-rows: 1fr;
    opacity: 1;
    visibility: visible;
  }
  .menu-clip {
    min-height: 0;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .menu-reveal,
    .nav-link :global(.chevron) {
      transition: none;
    }
  }
</style>
