<script lang="ts">
  import '../app.css';
  import '$lib/dashboard.css';
  import '../locales/main.loader.svelte.js';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';
  import { Theme } from '@astryx-sv/core/theme';
  import { InternationalizationProvider } from '@astryx-sv/core/i18n';
  import en from '@astryx-sv/core/locales/en.json';
  import pl from '@astryx-sv/core/locales/pl-PL.json';
  import { neutralTheme } from '@astryx-sv/theme-neutral';
  import {
    AppShell,
    Avatar,
    Banner,
    Button,
    Card,
    DropdownMenu,
    Heading,
    HStack,
    IconButton,
    SideNav,
    SideNavHeading,
    SideNavItem,
    SideNavSection,
    Text,
    TopNav,
    VStack
  } from '@astryx-sv/core';
  import { LogOut, UserRound } from '@lucide/svelte';
  import { initializePreferences, preferences } from '$lib/preferences.svelte';
  import AppearanceMenu from '$lib/AppearanceMenu.svelte';
  import NotificationInbox from '$lib/NotificationInbox.svelte';
  import { dashboardPath, tabFromPath, type Workspace } from '$lib/navigation';
  import { emptyProjectAccess, type Project } from '$lib/types';
  import { loadLocale } from 'wuchale/load-utils';

  let { data, children } = $props();

  let sidebarCollapsed = $state(untrack(() => data.sidebarCollapsed ?? false));
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
    Activity: 'Aktywność',
    Articles: 'Artykuły',
    Documentation: 'Dokumentacja',
    Forum: 'Forum',
    Kanban: 'Kanban',
    'Member profile': 'Profil członka',
    Members: 'Członkowie',
    'My profile': 'Mój profil',
    'New article': 'Nowy artykuł',
    'New project': 'Nowy projekt',
    'New task': 'Nowe zadanie',
    'New thread': 'Nowy wątek',
    Notifications: 'Powiadomienia',
    Overview: 'Przegląd',
    Permissions: 'Uprawnienia',
    'Preview credentials': 'Dane logowania podglądu',
    Projects: 'Projekty',
    'Removed tasks': 'Usunięte zadania',
    Settings: 'Ustawienia'
  });
  const rawTitle = $derived((merged.title as string | undefined) ?? 'Pulpit');
  const viewName = $derived(pageTitles[rawTitle] ?? rawTitle);
  const workspaceName = $derived(
    workspace === 'project' ? (project?.name ?? 'Projekt') : 'Całe koło'
  );
  const role = $derived(user?.role ?? 'member');

  const tabs = $derived([
    ['overview', 'Przegląd'],
    ['board', 'Kanban'],
    ['forum', 'Forum'],
    ['articles', 'Artykuły'],
    ['docs', 'Dokumentacja'],
    ['events', 'Aktywność'],
    ['roster', 'Członkowie'],
    ...((workspace === 'project' && (projectAccess.canEdit || projectAccess.canManageMembers)) ||
    (workspace === 'association' && data.canManageAlerts)
      ? [['settings', 'Ustawienia']]
      : []),
    ...(workspace === 'project' && projectAccess.canManageGroups
      ? [['permissions', 'Uprawnienia']]
      : []),
    ...(workspace === 'project' && projectAccess.canReadPreviewCredentials
      ? [['previews', 'Dane logowania podglądu']]
      : [])
  ] as [string, string][]);
  const pickerOptions = $derived([
    { label: 'Wszystkie projekty', href: '/projects' },
    { label: 'Całe koło', href: '/association' },
    ...projects.map((item) => ({
      label: item.name,
      href: dashboardPath(
        'project',
        item.slug,
        ['board', 'forum', 'articles', 'docs', 'events', 'roster'].includes(tab) ? tab : 'overview'
      )
    }))
  ]);
  const pickerItems = $derived(
    pickerOptions.map((option) => ({
      label: option.label,
      href: option.href
    }))
  );

  function changeTab(next: string) {
    void goto(dashboardPath(workspace, projectSlug, next));
  }

  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed = collapsed;
    document.cookie = `ksi-sidebar=${collapsed ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  onMount(() => {
    if (data.user?.membershipStatus !== 'active') return;
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
      stopped = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  });

  onMount(initializePreferences);
  $effect(() => {
    loadLocale(preferences.language);
  });
</script>

<svelte:head><title>{viewName} · KSI</title></svelte:head>

<Theme theme={neutralTheme} mode={preferences.theme}>
  <InternationalizationProvider
    locale={preferences.language}
    messages={{ en, 'en-us': en, pl, 'pl-PL': pl }}
  >
    {#if isolated || !user}
      {@render children()}
    {:else if user.membershipStatus !== 'active'}
      <VStack minHeight="100dvh" vAlign="center" hAlign="center" padding={4}>
        <Card padding={6} maxWidth={460}>
          <VStack gap={4}>
            <Heading level={1}>Konto wymaga aktywacji</Heading>
            <Text color="secondary">
              Twoje konto musi najpierw zostać aktywowane przez administratora. Zapytaj
              bezpośrednio:
              {data.activationContact}.
            </Text>
            <form method="POST" action="/logout">
              <Button type="submit" variant="secondary" label="Wyloguj się" width="100%" />
            </form>
          </VStack>
        </Card>
      </VStack>
    {:else}
      <AppShell height="fill" contentPadding={0} variant="section">
        {#snippet sideNav()}
          <SideNav
            collapsible={{
              isCollapsed: sidebarCollapsed,
              onCollapsedChange: setSidebarCollapsed
            }}
          >
            {#snippet header()}
              <SideNavHeading heading="KSI" subheading="core" headingHref="/" />
            {/snippet}
            {#snippet children()}
              {#if workspace !== 'directory'}
                <SideNavSection title={workspaceName}>
                  {#each tabs as [key, label] (key)}
                    <SideNavItem
                      {label}
                      href={dashboardPath(workspace, projectSlug, key)}
                      isSelected={tab === key}
                    />
                  {/each}
                </SideNavSection>
              {:else}
                <SideNavSection title="Projekty">
                  <SideNavItem
                    label="Wszystkie projekty"
                    href="/projects"
                    isSelected={tab === 'projects' || tab === '__create_project__'}
                  />
                  <SideNavItem label="Całe koło" href="/association" />
                </SideNavSection>
              {/if}
              <SideNavSection title="Koło">
                {#if workspace === 'project'}
                  <SideNavItem label="Całe koło" href="/association" />
                {/if}
                {#if role !== 'member'}
                  <SideNavItem label="Członkowie" href="/members" isSelected={tab === 'users'} />
                {/if}
                <SideNavItem label="Strona KSI" href={data.websiteOrigin} />
              </SideNavSection>
            {/snippet}
            {#snippet footer()}
              <VStack gap={1} padding={3}>
                <Text type="supporting" color="secondary">KSI · Uniwersytet Wrocławski</Text>
                <Text type="supporting" color="secondary">
                  v{import.meta.env.PUBLIC_APP_VERSION} ·
                  {#if import.meta.env.PUBLIC_COMMIT_HASH}
                    <a
                      href={`https://github.com/ksiuwr/ksi-core/commit/${import.meta.env.PUBLIC_COMMIT_HASH}`}
                      target="_blank"
                      rel="noopener noreferrer">{import.meta.env.PUBLIC_COMMIT_HASH.slice(0, 7)}</a
                    >
                  {:else}
                    <a
                      href="https://github.com/ksiuwr/ksi-core"
                      target="_blank"
                      rel="noopener noreferrer">Kod źródłowy</a
                    >
                  {/if}
                </Text>
              </VStack>
            {/snippet}
          </SideNav>
        {/snippet}

        {#snippet topNav()}
          <TopNav label="Nawigacja panelu">
            {#snippet heading()}
              <HStack gap={2} vAlign="center">
                <Text type="label" weight="semibold">KSI</Text>
              </HStack>
            {/snippet}
            {#snippet startContent()}
              <HStack gap={2} vAlign="center" minHeight={40}>
                <DropdownMenu
                  button={{
                    label: workspaceName,
                    variant: 'secondary',
                    size: 'sm'
                  }}
                  items={pickerItems}
                  menuWidth={260}
                />
                <Text type="supporting" color="secondary" maxLines={1}>{viewName}</Text>
              </HStack>
            {/snippet}
            {#snippet endContent()}
              <HStack gap={2} vAlign="center">
                <NotificationInbox
                  admin={inbox}
                  administrator={role === 'administrator'}
                  refresh={invalidateAll}
                  reportError={(message) => (error = message)}
                />
                <AppearanceMenu />
                {#if user.image}
                  <Avatar
                    src={user.image}
                    name={user.name ?? undefined}
                    size={32}
                    href={dashboardPath(workspace, projectSlug, 'profile')}
                  />
                {:else}
                  <IconButton
                    label="Mój profil"
                    tooltip="Mój profil"
                    variant="ghost"
                    size="sm"
                    href={dashboardPath(workspace, projectSlug, 'profile')}
                  >
                    {#snippet icon()}<UserRound size={18} aria-hidden="true" />{/snippet}
                  </IconButton>
                {/if}
                <IconButton
                  label="Wyloguj się"
                  tooltip="Wyloguj się"
                  variant="ghost"
                  size="sm"
                  onclick={() => {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = '/logout';
                    document.body.append(form);
                    form.submit();
                    form.remove();
                  }}
                >
                  {#snippet icon()}<LogOut size={16} aria-hidden="true" />{/snippet}
                </IconButton>
              </HStack>
            {/snippet}
          </TopNav>
        {/snippet}

        <VStack gap={4} padding={6} class="dash-workspace">
          {#if error}
            <Banner status="error" title={error} />
          {/if}
          {@render children()}
        </VStack>
      </AppShell>
    {/if}
  </InternationalizationProvider>
</Theme>
