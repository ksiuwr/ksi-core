<script lang="ts">
  import '@ksi-core/ui/platform.css';
  import '@ksi-core/ui/platform-theme.css';
  import '@ksi-core/ui/platform-kit.css';
  import '$lib/dashboard.css';
  import '../locales/main.loader.svelte.js';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, tick, untrack } from 'svelte';
  import { initializePreferences, preferences } from '$lib/preferences.svelte';
  import { loadLocale } from 'wuchale/load-utils';
  import NotificationInbox from '$lib/NotificationInbox.svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import { dashboardPath, tabFromPath, type Workspace } from '$lib/navigation';
  import { emptyProjectAccess, type Project } from '$lib/types';
  import {
    X,
    Menu,
    Folder,
    Columns3,
    MessagesSquare,
    FileText,
    Activity,
    LayoutDashboard,
    Users,
    UserRound,
    LogOut,
    SunMoon,
    ArrowUpRight,
    ChevronDown,
    Settings,
    Shield,
    PanelLeftClose,
    PanelLeftOpen
  } from '@lucide/svelte';

  let { data, children } = $props();

  let mobileNavigation = $state(false);
  let sidebarCollapsed = $state(untrack(() => data.sidebarCollapsed ?? false));
  let accountMenu = $state<HTMLDetailsElement>();
  let error = $state('');

  const user = $derived(data.user);
  const projects = $derived(data.projects ?? []);
  const inbox = $derived(data.inbox ?? { memberships: [], avatars: [] });
  const merged = $derived(page.data);
  const articleProject = $derived((merged.articleProject as Project | null | undefined) ?? null);
  const project = $derived((merged.project as Project | null | undefined) ?? articleProject);
  const projectAccess = $derived(merged.projectAccess ?? emptyProjectAccess);
  const pathname = $derived(page.url.pathname);
  const isolated = $derived(pathname.startsWith('/sso/'));
  const workspace = $derived<Workspace>(
    pathname.startsWith('/association')
      ? 'association'
      : project
        ? 'project'
        : merged.workspace === 'association'
          ? 'association'
          : 'directory'
  );
  const projectSlug = $derived(workspace === 'project' ? (project?.slug ?? '') : '');
  const scope = $derived(project?.id ?? '');
  const tab = $derived(tabFromPath(pathname));
  // Loaders send English page names; map the static ones through the catalog.
  const pageTitles = $derived<Record<string, string>>({
    Activity: 'Activity',
    Articles: 'Articles',
    Forum: 'Forum',
    Kanban: 'Kanban',
    'Member profile': 'Member profile',
    Members: 'Members',
    'My profile': 'My profile',
    'New project': 'New project',
    Notifications: 'Notifications',
    Overview: 'Overview',
    Permissions: 'Permissions',
    'Preview credentials': 'Preview credentials',
    Projects: 'Projects',
    'Removed tasks': 'Removed tasks',
    Settings: 'Settings'
  });
  const rawTitle = $derived((merged.title as string | undefined) ?? 'Dashboard');
  const viewName = $derived(pageTitles[rawTitle] ?? rawTitle);
  const language = $derived(preferences.language);
  const workspaceName = $derived(
    workspace === 'project' ? (project?.name ?? 'Project') : 'Association'
  );
  const role = $derived(user?.role ?? 'member');

  const tabs = $derived([
    ['overview', 'Overview'],
    ['board', 'Kanban'],
    ['forum', 'Forum'],
    ['articles', 'Articles'],
    ['events', 'Activity'],
    ['roster', 'Members'],
    ...(workspace === 'project' && (projectAccess.canEdit || projectAccess.canManageMembers)
      ? [['settings', 'Settings']]
      : []),
    ...(workspace === 'project' && projectAccess.canManageGroups
      ? [['permissions', 'Permissions']]
      : []),
    ...(workspace === 'project' && projectAccess.canReadPreviewCredentials
      ? [['previews', 'Preview credentials']]
      : [])
  ] as [string, string][]);
  const pickerOptions = $derived([
    { value: 'directory', label: 'All projects', href: '/projects' },
    { value: 'association', label: 'Association', href: '/association' },
    ...projects.map((item) => ({
      value: item.id,
      label: item.name,
      href: dashboardPath(
        'project',
        item.slug,
        ['board', 'forum', 'articles', 'events', 'roster'].includes(tab) ? tab : 'overview'
      )
    }))
  ]);
  const navigationIcons: Record<string, typeof LayoutDashboard> = {
    overview: LayoutDashboard,
    board: Columns3,
    forum: MessagesSquare,
    articles: FileText,
    events: Activity,
    roster: Users,
    settings: Settings,
    permissions: Shield,
    previews: Shield
  };
  const initials = $derived(
    `${(user?.firstName || user?.name || '')[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() ||
      'U'
  );

  function changeTab(next: string) {
    void goto(dashboardPath(workspace, projectSlug, next));
  }

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    document.cookie = `ksi-sidebar=${sidebarCollapsed ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  async function openNavigation() {
    mobileNavigation = !mobileNavigation;
    if (mobileNavigation) {
      await tick();
      document.querySelector<HTMLButtonElement>('.mobile-close')?.focus();
    }
  }

  function closeMenus(event: KeyboardEvent) {
    if (
      event.key === 'Tab' &&
      mobileNavigation &&
      window.matchMedia('(max-width: 760px)').matches
    ) {
      const controls = [
        ...document.querySelectorAll<HTMLElement>(
          '#dashboard-navigation button:not(:disabled), #dashboard-navigation a[href]'
        )
      ];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    if (event.key !== 'Escape') return;
    if (mobileNavigation) {
      mobileNavigation = false;
      document.getElementById('navigation-toggle')?.focus();
    }
    if (accountMenu?.open) {
      accountMenu.open = false;
      accountMenu.querySelector('summary')?.focus();
    }
  }

  function closeOutsideMenus(event: PointerEvent) {
    if (!(event.target instanceof Node)) return;
    if (accountMenu?.open && !accountMenu.contains(event.target)) accountMenu.open = false;
  }

  onMount(() => {
    if (data.user?.membershipStatus !== 'active') return;
    const viewport = window.matchMedia('(max-width: 760px)');
    const syncViewport = () => {
      if (!viewport.matches) mobileNavigation = false;
    };
    viewport.addEventListener('change', syncViewport);
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    async function connect() {
      try {
        const response = await fetch('/api/realtime/ticket', { method: 'POST' });
        const { ticket } = await response.json();
        if (stopped) return;
        socket = new WebSocket(`${data.websocketOrigin}/events`, `ksi.${ticket}`);
        socket.onmessage = () => {
          void invalidateAll();
        };
        socket.onclose = () => {
          if (!stopped) retry = setTimeout(() => void connect(), 5000);
        };
      } catch {
        if (!stopped) retry = setTimeout(() => void connect(), 10000);
      }
    }

    void connect();
    return () => {
      viewport.removeEventListener('change', syncViewport);
      stopped = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  });

  onMount(initializePreferences);
  $effect(() => {
    loadLocale(preferences.language === 'en' ? 'en-us' : 'pl');
  });
</script>

<svelte:head><title>{viewName} · KSI</title></svelte:head>
<svelte:window onkeydown={closeMenus} onpointerdown={closeOutsideMenus} />

{#if isolated || !user}
  {@render children()}
{:else if user.membershipStatus !== 'active'}
  <div class="pending-screen">
    <div class="pending-card">
      <h1>{'Account activation required'}</h1>
      <p>
        {'Your account first needs to be activated by an administrator. Ask directly:'}
        {data.activationContact}.
      </p>
      <form method="POST" action="/logout">
        <button class="btn" style="margin: 0 auto;">{'Sign out'}</button>
      </form>
    </div>
  </div>
{:else}
  <div class="dash-shell" class:sidebar-collapsed={sidebarCollapsed}>
    {#if mobileNavigation}
      <button
        class="navigation-backdrop"
        tabindex="-1"
        aria-hidden="true"
        aria-label={'Close navigation'}
        onclick={() => {
          mobileNavigation = false;
          document.getElementById('navigation-toggle')?.focus();
        }}
      ></button>
    {/if}
    <aside
      id="dashboard-navigation"
      class="dash-sidebar"
      class:mobile-open={mobileNavigation}
      role={mobileNavigation ? 'dialog' : undefined}
      aria-modal={mobileNavigation ? true : undefined}
      aria-label={'Navigation'}
    >
      <div class="sidebar-controls">
        <button
          class="sidebar-collapse"
          aria-controls="dashboard-navigation"
          aria-expanded={!sidebarCollapsed}
          aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          onclick={toggleSidebar}
        >
          {#if sidebarCollapsed}<PanelLeftOpen size={16} aria-hidden="true" />{:else}<PanelLeftClose
              size={16}
              aria-hidden="true"
            />{/if}
        </button>
        <button
          class="mobile-close"
          onclick={() => {
            mobileNavigation = false;
            document.getElementById('navigation-toggle')?.focus();
          }}
          aria-label={'Close navigation'}><X size={20} aria-hidden="true" /></button
        >
      </div>
      <div class="sidebar-brand">
        <span class="sidebar-logo">KSI<span class="sidebar-brand-suffix"> / core</span></span>
      </div>
      {#if workspace !== 'directory'}
        <nav aria-label={workspaceName}>
          {#each tabs as [key, label] (key)}
            {@const Icon = navigationIcons[key] ?? LayoutDashboard}
            <a
              class="sidebar-btn"
              class:active={tab === key}
              aria-current={tab === key ? 'page' : undefined}
              href={dashboardPath(workspace, projectSlug, key)}
              title={label}
            >
              <span class="navigation-label"
                ><Icon size={16} strokeWidth={1.7} aria-hidden="true" /><span
                  class="navigation-text">{label}</span
                ></span
              >
            </a>
          {/each}
        </nav>
      {:else}
        <a
          class="sidebar-btn"
          class:active={tab === 'projects' || tab === '__create_project__'}
          href="/projects"
          aria-current={tab === 'projects' ? 'page' : undefined}
          title={'Projects'}
          ><span class="navigation-label"
            ><Folder size={16} aria-hidden="true" /><span class="navigation-text">{'Projects'}</span
            ></span
          ></a
        >
        <a class="sidebar-btn" href="/association" title={'Association'}>
          <span class="navigation-label"
            ><Users size={16} aria-hidden="true" /><span class="navigation-text"
              >{'Association'}</span
            ></span
          ><ArrowUpRight size={14} aria-hidden="true" />
        </a>
        <p class="sidebar-hint">
          {'Choose a project to open its board, forum, and articles.'}
        </p>
      {/if}
      <div class="sidebar-global">
        {#if workspace === 'project'}
          <a class="sidebar-btn" href="/association" title={'Association'}
            ><span class="navigation-label"
              ><Users size={16} aria-hidden="true" /><span class="navigation-text"
                >{'Association'}</span
              ></span
            ><ArrowUpRight size={14} aria-hidden="true" /></a
          >
        {/if}
        {#if role !== 'member'}
          <span class="sidebar-section">{'Association management'}</span>
          <a
            class="sidebar-btn"
            class:active={tab === 'users'}
            aria-current={tab === 'users' ? 'page' : undefined}
            href="/members"
            title={'Members'}
            ><span class="navigation-label"
              ><UserRound size={16} aria-hidden="true" /><span class="navigation-text"
                >{'Members'}</span
              ></span
            ></a
          >
        {/if}
        <a class="sidebar-btn" href={data.websiteOrigin} title={'KSI website'}
          ><span class="navigation-label"
            ><ArrowUpRight size={16} aria-hidden="true" /><span class="navigation-text"
              >{'KSI website'}</span
            ></span
          ></a
        >
        <div class="sidebar-footnote">
          KSI · {'University of Wrocław'}
          <div class="build-details">
            v{import.meta.env.PUBLIC_APP_VERSION} ·
            <a
              href={import.meta.env.PUBLIC_COMMIT_HASH
                ? `https://github.com/ksiuwr/ksi-core/commit/${import.meta.env.PUBLIC_COMMIT_HASH}`
                : 'https://github.com/ksiuwr/ksi-core'}
              target="_blank"
              rel="noopener noreferrer"
              >{import.meta.env.PUBLIC_COMMIT_HASH?.slice(0, 7) || 'Source'}</a
            >
          </div>
        </div>
      </div>
    </aside>

    <div class="dash-body" inert={mobileNavigation}>
      <header class="dash-topbar">
        <button
          id="navigation-toggle"
          class="navigation-toggle"
          aria-controls="dashboard-navigation"
          aria-expanded={mobileNavigation}
          onclick={openNavigation}
        >
          <Menu size={20} strokeWidth={1.7} aria-hidden="true" /><span class="sr-only"
            >{'Navigation'}</span
          >
        </button>
        <div class="workspace-picker">
          <Dropdown
            label={'Choose workspace'}
            value={workspace === 'project'
              ? scope
              : workspace === 'association'
                ? 'association'
                : 'directory'}
            options={pickerOptions}
            placeholder={workspaceName}
            searchable
            variant="bar"
            searchPlaceholder={'Search projects…'}
            emptyLabel={'No projects found.'}
          >
            {#snippet leading()}<Folder size={16} strokeWidth={1.7} aria-hidden="true" />{/snippet}
          </Dropdown>
        </div>
        <nav class="workspace-breadcrumb" aria-label={'Current page'}>
          <span aria-hidden="true">/</span><strong>{viewName}</strong>
        </nav>
        <div class="topbar-controls">
          <NotificationInbox
            {language}
            admin={inbox}
            administrator={role === 'administrator'}
            refresh={invalidateAll}
            reportError={(message) => (error = message)}
          />
          <a
            class="topbar-control"
            href="/settings"
            aria-label={'Settings'}
            title={'Settings'}
            aria-current={tab === 'user-settings' ? 'page' : undefined}
            ><SunMoon size={18} aria-hidden="true" /></a
          >
          <details class="topbar-menu" bind:this={accountMenu}>
            <summary aria-label={'My account'}
              ><span class="account-avatar"
                >{#if user.image}<img src={user.image} alt="" />{:else}{initials}{/if}</span
              ><span class="account-name">{user.firstName || user.name}</span><ChevronDown
                size={14}
                aria-hidden="true"
              /></summary
            >
            <div class="menu-panel account-panel">
              <strong>{user.firstName || user.name} {user.lastName}</strong>
              <span class="muted">{'Account settings'}</span>
              <button class="account-action" onclick={() => changeTab('profile')}
                ><UserRound size={16} aria-hidden="true" />{'My profile'}</button
              >
              <form method="POST" action="/logout">
                <button class="account-action sign-out"
                  ><LogOut size={16} aria-hidden="true" />{'Sign out'}</button
                >
              </form>
            </div>
          </details>
        </div>
      </header>
      <main class="dash-workspace">
        {#if error}<p class="error" role="alert">{error}</p>{/if}
        {@render children()}
      </main>
    </div>
  </div>
{/if}
