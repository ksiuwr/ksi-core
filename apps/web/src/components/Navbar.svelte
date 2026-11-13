<script lang="ts">
  import { LogOut, Menu } from '@lucide/svelte';
  import type { Profile as User } from 'shared/types';
  type Session = { id: string };

  import { toast } from 'svelte-sonner';
  import { afterNavigate, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { locale, setLocale } from '$lib/locale.svelte';
  import {
    Avatar,
    Button,
    Drawer,
    Heading,
    HStack,
    IconButton,
    Link,
    Text,
    TopNav,
    TopNavItem,
    TopNavMenu,
    VStack
  } from '@astryx-sv/core';
  import ThemeSelector from '@ksi-core/ui/platform/ThemeSelector.svelte';

  interface Props {
    user: User | null;
    session: Session | null;
  }

  const { user, session }: Props = $props();

  let mobileOpen = $state(false);
  const member = $derived(Boolean(session && user?.membershipStatus === 'active'));
  const loginHref = $derived(
    `/login?returnTo=${encodeURIComponent(page.url.pathname + page.url.search)}`
  );

  afterNavigate(() => (mobileOpen = false));

  async function logout() {
    const response = await fetch('/logout', { method: 'POST' });
    if (response.ok) {
      toast.success('Wylogowano');
      mobileOpen = false;
      await invalidateAll();
    }
  }

  // @wc-ignore
  const projectMenu = [
    {
      title: 'ZOSIA',
      description: 'Nasz zimowy obóz dla studentów informatyki na Dolnym Śląsku.',
      href: '/projects/zosia'
    },
    {
      title: 'LEOSIA',
      description: 'Letnia wersja ZOSI. W przygotowaniu.',
      href: '/projects/leosia'
    },
    {
      title: 'ksi-core',
      description: 'Kod tej strony.',
      href: '/projects/ksi-core'
    },
    {
      title: 'Wszystkie projekty',
      description: 'Przeglądaj projekty koła.',
      href: '/projects'
    }
  ];

  // @wc-ignore
  const groupMenu = [
    {
      title: 'Społeczność',
      description: 'Obozy, wydarzenia i spotkania.',
      href: '/projects?field=community#project-directory'
    },
    {
      title: 'Technika',
      description: 'Oprogramowanie i narzędzia tworzone przez członków koła.',
      href: '/projects?field=engineering#project-directory'
    },
    {
      title: 'Badania naukowe',
      description: 'Dyskusje o pracach naukowych i badania z pracownikami naukowymi.',
      href: '/projects?field=research#project-directory'
    }
  ];
</script>

{#snippet menuIcon()}<Menu size={18} aria-hidden="true" />{/snippet}
{#snippet logoutIcon()}<LogOut size={16} aria-hidden="true" />{/snippet}
{#snippet localeLabel()}<Text as="span" type="supporting"
    >{locale.current === 'pl' ? 'EN' : 'PL'}</Text
  >{/snippet}

<header class="border-line bg-paper/80 sticky top-0 z-40 border-b backdrop-blur-md">
  <div class="page-container" class:docs-container={page.url.pathname.startsWith('/docs')}>
    <TopNav label="Nawigacja główna">
      {#snippet heading()}
        <Link href="/" color="primary" type="label" weight="bold">
          <HStack gap={2} vAlign="center">
            <img src="/logo.svg" alt="" class="size-7 dark:invert" />
            <Text as="span" type="large" weight="semibold">KSI</Text>
          </HStack>
        </Link>
      {/snippet}
      {#snippet startContent()}
        <HStack gap={1} vAlign="center" wrap="nowrap" class="hidden lg:flex">
          <TopNavMenu label="Projekty" items={projectMenu} />
          <TopNavMenu label="Grupy" items={groupMenu} />
          <TopNavItem
            label="Artykuły"
            href="/articles"
            isSelected={page.url.pathname.startsWith('/articles')}
          />
          <TopNavItem
            label="Dokumentacja"
            href="/docs"
            isSelected={page.url.pathname.startsWith('/docs')}
          />
          {#if member}
            <TopNavItem label="Panel" href={page.data.dashboardOrigin} />
          {/if}
        </HStack>
      {/snippet}
      {#snippet endContent()}
        <HStack gap={2} vAlign="center" class="hidden lg:flex">
          <ThemeSelector />
          <Button
            variant="secondary"
            size="sm"
            label="Zmień język"
            tooltip="Zmień język"
            children={localeLabel}
            onclick={() => setLocale(locale.current === 'pl' ? 'en-us' : 'pl')}
          />
          {#if member && user}
            <HStack gap={1} vAlign="center">
              <Button href={page.data.dashboardOrigin} variant="ghost" size="sm" label={user.name}>
                <Avatar src={user.image ?? undefined} name={user.name} size={24} />
                <Text as="span" type="supporting" maxLines={1}>{user.name}</Text>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                label="Wyloguj"
                tooltip="Wyloguj"
                icon={logoutIcon}
                onclick={logout}
              />
            </HStack>
          {:else}
            <Button href={loginHref} variant="primary" size="sm" label="Zaloguj się" />
          {/if}
        </HStack>
        <span class="lg:hidden">
          <IconButton
            variant="ghost"
            size="sm"
            label="Przełącz menu mobilne"
            tooltip="Menu"
            icon={menuIcon}
            onclick={() => (mobileOpen = true)}
          />
        </span>
      {/snippet}
    </TopNav>
  </div>
</header>

<Drawer
  isOpen={mobileOpen}
  onOpenChange={(open) => (mobileOpen = open)}
  label="Menu"
  side="end"
  padding={4}
>
  <VStack gap={4}>
    <Heading level={2} type="display-3">KSI</Heading>
    <VStack gap={1}>
      <Button variant="ghost" label="Projekty" href="/projects" width="100%" />
      <Button variant="ghost" label="Grupy" href="/projects" width="100%" />
      <Button variant="ghost" label="Artykuły" href="/articles" width="100%" />
      <Button variant="ghost" label="Dokumentacja" href="/docs" width="100%" />
      {#if member}
        <Button variant="ghost" label="Panel" href={page.data.dashboardOrigin} width="100%" />
      {/if}
    </VStack>
    <HStack gap={2} vAlign="center">
      <ThemeSelector />
      <Button
        variant="secondary"
        size="sm"
        label="Zmień język"
        onclick={() => setLocale(locale.current === 'pl' ? 'en-us' : 'pl')}
        >{locale.current === 'pl' ? 'EN' : 'PL'}</Button
      >
    </HStack>
    {#if member && user}
      <HStack justify="between" vAlign="center" gap={2}>
        <HStack gap={2} vAlign="center">
          <Avatar src={user.image ?? undefined} name={user.name} size={32} />
          <Text type="body" weight="medium" maxLines={1}>{user.name}</Text>
        </HStack>
        <Button variant="secondary" size="sm" label="Wyloguj" onclick={logout} />
      </HStack>
    {:else}
      <Button href={loginHref} variant="primary" label="Zaloguj się" width="100%" />
    {/if}
  </VStack>
</Drawer>

<style>
  .docs-container {
    max-width: 1360px;
  }
</style>
