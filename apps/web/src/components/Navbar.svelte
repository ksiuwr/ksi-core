<script lang="ts">
  import {
    ChevronDown,
    CodeXml,
    FlaskConical,
    Github,
    LogIn,
    LogOut,
    Menu,
    Mountain,
    MountainSnow,
    Share2
  } from '@lucide/svelte';
  import { sidebarStore } from '$lib/sidebar';
  import type { Profile as User } from 'shared/types';
  type Session = { id: string };
  import { toast } from 'svelte-sonner';
  import { afterNavigate, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { MediaQuery } from 'svelte/reactivity';
  import { tick } from 'svelte';
  import Alert from './Alert.svelte';
  import { locale, setLocale } from '$lib/locale.svelte';
  import ThemeSelector from '@ksi-core/ui/platform/ThemeSelector.svelte';
  import NavMenuPanel from './ui/NavMenuPanel.svelte';
  import type { api } from '$lib/backend';

  interface Props {
    alert: NonNullable<Awaited<ReturnType<typeof api.alerts.current.get>>['data']> | null;
    user: User | null;
    session: Session | null;
  }

  const { alert, user, session }: Props = $props();

  // @wc-ignore
  const keys = {
    Escape: 'Escape',
    ArrowDown: 'ArrowDown'
  };

  let openMenu = $state<'projects' | 'groups' | 'mobile' | null>(null);

  let displayedMenu = $state<'projects' | 'groups' | 'mobile'>('projects');
  let header: HTMLElement = undefined as unknown as HTMLElement;
  const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
  const desktop = new MediaQuery('(min-width: 64rem)');

  function toggleMenu(menu: 'projects' | 'groups' | 'mobile') {
    displayedMenu = menu;
    openMenu = openMenu === menu ? null : menu;
  }

  async function handleTriggerKey(event: KeyboardEvent, menu: 'projects' | 'groups' | 'mobile') {
    if (event.key !== keys.ArrowDown) return;
    event.preventDefault();
    displayedMenu = menu;
    openMenu = menu;
    await tick();
    header.querySelector<HTMLAnchorElement>('#navbar-menu a')?.focus();
  }

  $effect(() => {
    if (!desktop.current) closeMenu();
  });

  function closeMenu() {
    openMenu = null;
  }

  afterNavigate(closeMenu);

  const projectItems = [
    {
      title: 'ZOSIA',
      description: 'Our winter camp for computer science students in Lower Silesia.',
      href: '/projects/zosia',
      icon: MountainSnow
    },
    {
      title: 'LEOSIA',
      description: 'A summer version of ZOSIA, in preparation.',
      href: '/projects',
      icon: Mountain,
      badge: 'Soon'
    },
    {
      title: 'ksi-core',
      description: 'The code behind this website.',
      href: 'https://github.com/ksiuwr/ksi-core',
      icon: Github,
      external: true
    }
  ];

  const groupItems = [
    {
      title: 'Social',
      description: 'Camps, events, and meetups.',
      href: '/projects?field=community#project-directory',
      icon: Share2
    },
    {
      title: 'Technical',
      description: 'Software and tools built by our members.',
      href: '/projects?field=engineering#project-directory',
      icon: CodeXml
    },
    {
      title: 'Scientific research',
      description: 'Paper discussions and research with faculty.',
      href: '/projects?field=research#project-directory',
      icon: FlaskConical
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

{#if alert}
  <div class="w-full">
    <Alert {alert} />
  </div>
{/if}

<header
  id="navbar"
  bind:this={header}
  onfocusout={(event) => {
    if (event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) closeMenu();
  }}
  class="border-base-content/15 bg-base-100 fixed top-0 z-40 flex w-full flex-col border-b border-solid backdrop-blur-sm"
>
  <div class="flex h-14 w-full shrink-0 flex-row items-center justify-between lg:px-8">
    <div class="flex h-full items-center">
      <a
        href="/"
        class="hover:bg-primary flex h-full items-center gap-3 px-4 transition-colors duration-150 lg:pr-6"
        style="color: var(--ink);"
      >
        <img src="/logo.svg" alt="" class="size-8 min-w-10 shrink-0 dark:invert" />
        <span class="font-anybody text-xl tracking-tight not-lg:hidden" style="color: inherit;"
          >KSI</span
        >
      </a>
    </div>
    <nav class="flex h-full items-center gap-3 not-lg:hidden">
      <button
        type="button"
        onclick={() => toggleMenu('projects')}
        onkeydown={(event) => handleTriggerKey(event, 'projects')}
        aria-controls="navbar-menu"
        aria-expanded={openMenu === 'projects'}
        class="btn btn-outline {openMenu === 'projects' ||
        $page.url.pathname.startsWith('/projects')
          ? 'active'
          : ''}"
        style="height: 32px; min-height: 32px; font-size: 12px; gap: 6px;"
      >
        Projects
        <ChevronDown
          class="size-3.5 shrink-0 transition-transform duration-300 {openMenu === 'projects'
            ? 'rotate-180'
            : ''}"
        />
      </button>
      <button
        type="button"
        onclick={() => toggleMenu('groups')}
        onkeydown={(event) => handleTriggerKey(event, 'groups')}
        aria-controls="navbar-menu"
        aria-expanded={openMenu === 'groups'}
        class="btn btn-outline {openMenu === 'groups' || $page.url.pathname.startsWith('/groups')
          ? 'active'
          : ''}"
        style="height: 32px; min-height: 32px; font-size: 12px; gap: 6px;"
      >
        Groups
        <ChevronDown
          class="size-3.5 shrink-0 transition-transform duration-300 {openMenu === 'groups'
            ? 'rotate-180'
            : ''}"
        />
      </button>
      {#if session && user && user.membershipStatus === 'active'}
        <a
          href={$page.data.dashboardOrigin}
          class="btn btn-outline {$page.url.pathname.startsWith('/dashboard') ? 'active' : ''}"
          style="height: 32px; min-height: 32px; font-size: 12px;"
        >
          Dashboard
        </a>
      {/if}
    </nav>

    <div class="flex h-full items-center pr-4 lg:hidden">
      <button
        onclick={() => toggleMenu('mobile')}
        class="btn btn-square btn-outline"
        style="min-height: 32px; height: 32px; width: 32px; padding: 0;"
        aria-label="Toggle mobile menu"
      >
        <Menu class="size-4" />
      </button>
    </div>
    <div class="flex h-full items-center gap-2 pr-6 not-lg:hidden">
      <ThemeSelector language={locale.current === 'en-us' ? 'en' : 'pl'} />
      <button
        class="btn btn-outline"
        style="min-height: 32px; height: 32px; padding: 0 12px; font-size: 11px;"
        aria-label="Change language"
        onclick={() => setLocale(locale.current === 'pl' ? 'en-us' : 'pl')}
        >{locale.current === 'pl' ? 'EN' : 'PL'}</button
      >
      {#if session && user && user.membershipStatus === 'active'}
        <div class="border-base-200 flex h-full items-center gap-4 border-r px-2">
          <a
            href={$page.data.dashboardOrigin}
            class="flex items-center gap-4 text-sm"
            style="color: var(--ink);"
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
            class="btn btn-square btn-sm btn-outline text-error"
            onclick={async () => {
              const r = await fetch('/logout', { method: 'POST' });
              if (r.ok) {
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
            window.location.assign('/login');
          }}
          class="btn btn-primary gap-3"
        >
          <LogIn class="size-3 shrink-0" />
          Sign in
        </button>
      {/if}
    </div>
  </div>

  <div
    id="navbar-menu"
    class="menu-reveal"
    class:menu-open={openMenu !== null}
    inert={openMenu === null}
  >
    <div class="menu-clip">
      <div class="bg-base-100 border-base-content/15 border-b border-solid">
        {#if displayedMenu === 'mobile'}
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a
                href="/projects"
                onclick={closeMenu}
                class="btn btn-outline"
                style="justify-content: flex-start; height: 32px; min-height: 32px; font-size: 13px;"
                >Projects</a
              >
              <a
                href="/groups"
                onclick={closeMenu}
                class="btn btn-outline"
                style="justify-content: flex-start; height: 32px; min-height: 32px; font-size: 13px;"
                >Groups</a
              >
              {#if session && user && user.membershipStatus === 'active'}
                <a
                  href={$page.data.dashboardOrigin}
                  onclick={closeMenu}
                  class="btn btn-outline"
                  style="justify-content: flex-start; height: 32px; min-height: 32px; font-size: 13px;"
                  >Dashboard</a
                >
              {/if}
            </div>
            <div style="height: 1px; background: var(--line);"></div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <ThemeSelector language={locale.current === 'en-us' ? 'en' : 'pl'} />
              <button
                class="btn btn-outline"
                style="min-height: 32px; height: 32px; padding: 0 12px; font-size: 11px;"
                aria-label="Change language"
                onclick={() => setLocale(locale.current === 'pl' ? 'en-us' : 'pl')}
                >{locale.current === 'pl' ? 'EN' : 'PL'}</button
              >
            </div>
            <div style="height: 1px; background: var(--line);"></div>
            {#if session && user}
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div
                  style="display: flex; align-items: center; gap: 8px; color: var(--ink); font-size: 14px;"
                >
                  {#if user.image}
                    <img src={user.image} class="size-6 rounded-full" alt="" />
                  {/if}
                  {user.name}
                </div>
                <button
                  class="btn btn-outline text-error"
                  style="min-height: 32px; height: 32px; padding: 0 12px;"
                  onclick={async () => {
                    const r = await fetch('/logout', { method: 'POST' });
                    if (r.ok) {
                      toast.success('Logged out');
                      closeMenu();
                      await invalidateAll();
                    }
                  }}>Logout</button
                >
              </div>
            {:else}
              <button
                class="btn btn-primary"
                style="min-height: 32px; height: 32px;"
                onclick={() => window.location.assign('/login')}>Sign in</button
              >
            {/if}
          </div>
        {:else if displayedMenu === 'projects'}
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
    </div>
  </div>
</header>

{#if openMenu}
  <div
    transition:fade={{ duration: reducedMotion.current ? 0 : 240, easing: cubicOut }}
    role="presentation"
    class="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
    onclick={closeMenu}
  ></div>
{/if}

<style>
  .menu-reveal {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    visibility: hidden;
    transition:
      grid-template-rows 320ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 220ms ease,
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
    header :global(svg) {
      transition: none;
    }
  }
</style>
