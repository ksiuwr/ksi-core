<script lang="ts">
  import AvatarUpload, { type AvatarRequest } from '$lib/AvatarUpload.svelte';
  import ContentTranslations from '$lib/ContentTranslations.svelte';
  import SettingsNav from '$lib/SettingsNav.svelte';
  import { api, errorMessage } from '$lib/api';
  import { untrack } from 'svelte';
  import { validProfileLink } from 'shared/profile-links';
  import { summarizeUserAgent } from 'shared/user-agent';
  import { primaryContentLocale, type ContentLocale } from 'shared/content-locales';
  import type { Profile } from 'shared/types';
  import {
    Avatar,
    Badge,
    Banner,
    Button,
    Card,
    EmptyState,
    Grid,
    GridSpan,
    Heading,
    HStack,
    Icon,
    List,
    ListItem,
    Selector,
    Text,
    TextArea,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import {
    ArrowUpRight,
    Check,
    Github,
    Image as ImageIcon,
    Laptop,
    Link2,
    Linkedin,
    Save,
    Trash2,
    UserRound
  } from '@lucide/svelte';

  type Session = {
    id: string;
    createdAt: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    isCurrent: boolean;
  };

  let {
    profile,
    avatarRequest,
    activeSessions,
    websiteOrigin,
    refresh
  }: {
    profile: Profile;
    avatarRequest: AvatarRequest | null;
    activeSessions: Session[];
    websiteOrigin: string;
    refresh: () => Promise<void>;
  } = $props();

  let draft = $state<Profile>(untrack(() => ({ ...profile })));
  let sessions = $state<Session[]>(untrack(() => [...activeSessions]));
  let busy = $state(false);
  let saved = $state(false);
  let dirty = $state(false);
  let error = $state('');
  let contentLocale = $state<ContentLocale>(primaryContentLocale);
  let translationDraft = $state<Record<string, string>>({});

  type LocalizedProfileField = 'firstName' | 'lastName' | 'nickname' | 'bio';
  function localized(key: LocalizedProfileField) {
    return contentLocale === primaryContentLocale
      ? (draft[key] ?? '')
      : (translationDraft[key] ?? '');
  }
  function setLocalized(key: LocalizedProfileField, value: string) {
    if (contentLocale === primaryContentLocale) draft[key] = value;
    else translationDraft[key] = value;
  }

  const privacyOptions = $derived([
    { value: 'full-name', label: 'Pełne imię i nazwisko' },
    { value: 'last-initial', label: 'Imię i inicjał nazwiska' },
    { value: 'initials', label: 'Tylko inicjały' }
  ]);
  const publicName = $derived(
    draft.publicPrivacy === 'initials'
      ? `${draft.firstName?.[0] ?? ''}.${draft.lastName?.[0] ? ` ${draft.lastName[0]}.` : ''}`
      : draft.publicPrivacy === 'last-initial'
        ? `${draft.firstName} ${draft.lastName?.[0] ? `${draft.lastName[0]}.` : ''}`
        : `${draft.firstName} ${draft.lastName}`
  );

  function sessionDescription(session: Session) {
    const client = summarizeUserAgent(session.userAgent);
    const browser =
      client.browser && client.os
        ? `${client.browser} na ${client.os}`
        : (client.browser ?? 'Nieznana przeglądarka');
    return session.ipAddress ? `${browser} · ${session.ipAddress}` : browser;
  }

  async function run(work: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await work();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  function saveProfile() {
    saved = false;
    if (!validProfileLink('github', draft.github)) {
      error = 'Wprowadź link do profilu https://github.com/username.';
      return;
    }
    if (!validProfileLink('linkedin', draft.linkedin)) {
      error = 'Wprowadź link do profilu https://linkedin.com/in/username.';
      return;
    }
    void run(async () => {
      const result = await api<{ user: Profile }>('/users/me', 'PATCH', {
        firstName: draft.firstName,
        lastName: draft.lastName,
        nickname: draft.nickname ?? '',
        bio: draft.bio ?? '',
        github: draft.github || null,
        linkedin: draft.linkedin || null,
        publicPrivacy: draft.publicPrivacy
      });
      draft = { ...result.user };
      saved = true;
      dirty = false;
      await refresh();
    });
  }

  function revokeSession(id: string) {
    void run(async () => {
      await api(`/users/me/sessions/${encodeURIComponent(id)}`, 'DELETE');
      sessions = sessions.filter((session) => session.id !== id);
    });
  }

  function deleteAccount() {
    void run(async () => {
      await api('/users/me', 'DELETE');
      location.reload();
    });
  }
</script>

<VStack gap={5}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <VStack gap={1}>
      <Heading level={1}>Profil</Heading>
      <Text as="p" class="workspace-description">
        Przedstaw się kołu i wybierz, czym chcesz się podzielić publicznie.
      </Text>
    </VStack>
    <Button
      href={`${websiteOrigin}/members/${encodeURIComponent(draft.id)}`}
      variant="secondary"
      label="Zobacz publiczny profil"
    >
      {#snippet icon()}<ArrowUpRight size={15} aria-hidden="true" />{/snippet}
    </Button>
  </HStack>

  <HStack vAlign="start" gap={10} wrap="wrap">
    <VStack class="settings-nav-column">
      <SettingsNav
        label={'Sekcje profilu'}
        items={[
          { id: 'about', label: 'O Tobie', icon: UserRound },
          { id: 'photo', label: 'Zdjęcie profilowe', icon: ImageIcon },
          { id: 'links', label: 'Znajdź mnie w sieci', icon: Link2 },
          { id: 'sessions', label: 'Aktywne sesje', icon: Laptop },
          { id: 'danger', label: 'Usuń konto', icon: Trash2, danger: true }
        ]}
      />
    </VStack>

    <VStack gap={8} class="settings-main-column">
      <form
        onsubmit={(event) => {
          event.preventDefault();
          if (contentLocale !== primaryContentLocale) return;
          saveProfile();
        }}
        oninput={(event) => {
          if (
            contentLocale !== primaryContentLocale &&
            event.target instanceof Element &&
            event.target.closest('.localized-profile-fields')
          )
            return;
          saved = false;
          dirty = true;
        }}
      >
        <VStack gap={6}>
          {#if error}<Banner status="error" title={error} role="alert" />{/if}

          <Card padding={4}>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <Avatar
                src={draft.image ?? undefined}
                name={publicName}
                size={60}
                shape="rounded"
                alt=""
              />
              <VStack gap={1} class="profile-hero-text">
                <HStack gap={1.5} vAlign="start" wrap="wrap">
                  <Text weight="semibold">{publicName}</Text>
                  {#if draft.nickname?.trim()}
                    <Text type="supporting">aka. {draft.nickname}</Text>
                  {/if}
                </HStack>
                <Text as="p" type="supporting" maxLines={1}>
                  {draft.bio || 'Twój publiczny profil na stronie KSI.'}
                </Text>
              </VStack>
              <HStack gap={2} wrap="wrap">
                {#if draft.github && validProfileLink('github', draft.github)}
                  <Button
                    href={draft.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                    size="sm"
                    label="GitHub"
                  >
                    {#snippet icon()}<Github size={14} aria-hidden="true" />{/snippet}
                  </Button>
                {/if}
                {#if draft.linkedin && validProfileLink('linkedin', draft.linkedin)}
                  <Button
                    href={draft.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                    size="sm"
                    label="LinkedIn"
                  >
                    {#snippet icon()}<Linkedin size={14} aria-hidden="true" />{/snippet}
                  </Button>
                {/if}
              </HStack>
            </HStack>
          </Card>

          <VStack id="about" gap={3} aria-labelledby="identity-heading">
            <Heading id="identity-heading" level={2}>O Tobie</Heading>
            <ContentTranslations
              kind="profile"
              id={draft.id}
              translations={draft.translations}
              baseline={{
                firstName: draft.firstName,
                lastName: draft.lastName,
                nickname: draft.nickname,
                bio: draft.bio
              }}
              bind:selected={contentLocale}
              bind:draft={translationDraft}
              onsaved={(result) => {
                draft.translations = result.translations;
              }}
            />
            <Card padding={4}>
              <Grid class="localized-profile-fields" columns={{ minWidth: 200, max: 2 }} gap={4}>
                <TextInput
                  id="p-first"
                  label="Imię"
                  value={localized('firstName')}
                  onChange={(value) => setLocalized('firstName', value)}
                  isRequired={contentLocale === primaryContentLocale}
                />
                <TextInput
                  id="p-last"
                  label="Nazwisko"
                  value={localized('lastName')}
                  onChange={(value) => setLocalized('lastName', value)}
                />
                <GridSpan columns="full">
                  <TextInput
                    id="p-nick"
                    label="Pseudonim"
                    value={localized('nickname')}
                    onChange={(value) => setLocalized('nickname', value)}
                    placeholder={'Jak mamy się do ciebie zwracać?'}
                  />
                </GridSpan>
                <GridSpan columns="full">
                  <TextArea
                    id="p-bio"
                    label="Kilka słów o sobie"
                    value={localized('bio')}
                    onChange={(value) => setLocalized('bio', value)}
                    rows={4}
                    placeholder={'Zainteresowania, projekty, rzeczy, które lubisz…'}
                  />
                </GridSpan>
                {#if contentLocale === primaryContentLocale}
                  <GridSpan columns="full">
                    <VStack gap={1}>
                      <Selector
                        id="p-priv"
                        label="Widoczność imienia i nazwiska"
                        value={draft.publicPrivacy}
                        options={privacyOptions}
                        width="100%"
                        onChange={(value: string | null) => {
                          if (value === null) return;
                          draft.publicPrivacy = value as Profile['publicPrivacy'];
                          saved = false;
                          dirty = true;
                        }}
                      />
                      <Text type="supporting">
                        Dotyczy publicznej strony internetowej. Członkowie widzą twoje imię i
                        nazwisko w panelu.
                      </Text>
                    </VStack>
                  </GridSpan>
                {/if}
              </Grid>
            </Card>
          </VStack>

          <VStack id="photo" gap={3} class="photo-section" aria-label={'Zdjęcie profilowe'}>
            <Heading level={2}>Zdjęcie profilowe</Heading>
            <Card padding={4}>
              <AvatarUpload
                request={avatarRequest}
                onchange={refresh}
                reportError={(message) => (error = message)}
              />
            </Card>
          </VStack>

          <VStack id="links" gap={3} aria-labelledby="links-heading">
            <Heading id="links-heading" level={2}>Znajdź mnie w sieci</Heading>
            <Card padding={4}>
              <Grid columns={{ minWidth: 220, max: 2 }} gap={4}>
                <VStack gap={1}>
                  <TextInput
                    id="p-gh"
                    label="GitHub"
                    value={draft.github ?? ''}
                    onChange={(value) => (draft.github = value)}
                    placeholder="https://github.com/…"
                  >
                    {#snippet startIcon()}<Github size={14} aria-hidden="true" />{/snippet}
                  </TextInput>
                  {#if !validProfileLink('github', draft.github)}
                    <Text as="p" role="status" class="field-error">
                      Użyj linku https://github.com/username.
                    </Text>
                  {/if}
                </VStack>
                <VStack gap={1}>
                  <TextInput
                    id="p-li"
                    label="LinkedIn"
                    value={draft.linkedin ?? ''}
                    onChange={(value) => (draft.linkedin = value)}
                    placeholder="https://linkedin.com/in/…"
                  >
                    {#snippet startIcon()}<Linkedin size={14} aria-hidden="true" />{/snippet}
                  </TextInput>
                  {#if !validProfileLink('linkedin', draft.linkedin)}
                    <Text as="p" role="status" class="field-error">
                      Użyj linku https://linkedin.com/in/username.
                    </Text>
                  {/if}
                </VStack>
              </Grid>
            </Card>
          </VStack>

          {#if contentLocale === primaryContentLocale && (dirty || saved)}
            <HStack class="save-bar" hAlign="between" vAlign="center" gap={3}>
              <HStack gap={1} vAlign="center" role="status">
                {#if saved}
                  <Check size={15} aria-hidden="true" />Zapisano
                {:else}
                  Niezapisane zmiany
                {/if}
              </HStack>
              <Button type="submit" variant="primary" label="Zapisz zmiany" isDisabled={busy}>
                {#snippet icon()}<Save size={16} aria-hidden="true" />{/snippet}
              </Button>
            </HStack>
          {/if}
        </VStack>
      </form>

      <VStack id="sessions" gap={3} aria-labelledby="sessions-heading">
        <VStack gap={1}>
          <Heading id="sessions-heading" level={2}>Aktywne sesje</Heading>
          <Text as="p" type="supporting">
            Urządzenia i przeglądarki aktualnie zalogowane na Twoje konto KSI.
          </Text>
        </VStack>
        {#if sessions.length === 0}
          <EmptyState isCompact title="Brak aktywnych sesji" />
        {:else}
          <List hasDividers edge="outset">
            {#each sessions as session (session.id)}
              <ListItem label={session.isCurrent ? 'Bieżące urządzenie' : 'Inne urządzenie'}>
                {#snippet startContent()}
                  <Icon icon={Laptop} size="sm" color="secondary" />
                {/snippet}
                {#snippet description()}
                  <Text type="supporting">{sessionDescription(session)}</Text>
                {/snippet}
                {#snippet endContent()}
                  {#if session.isCurrent}
                    <Badge variant="success" label="Bieżąca" />
                  {:else}
                    <Button
                      variant="secondary"
                      size="sm"
                      label="Odwołaj"
                      isDisabled={busy}
                      onclick={() => revokeSession(session.id)}
                    />
                  {/if}
                {/snippet}
              </ListItem>
            {/each}
          </List>
        {/if}
      </VStack>

      <VStack id="danger" gap={3} aria-labelledby="danger-heading">
        <Heading id="danger-heading" level={2}>Usuń konto</Heading>
        <Card padding={4} class="danger-card">
          <VStack gap={3}>
            <Text as="p" type="supporting">
              Twój profil zostanie zanonimizowany. Treści koła pozostaną.
            </Text>
            <HStack>
              <Button
                variant="destructive"
                label="Potwierdzam usunięcie konta"
                isDisabled={busy}
                onclick={deleteAccount}
              />
            </HStack>
          </VStack>
        </Card>
      </VStack>
    </VStack>
  </HStack>
</VStack>

<style>
  :global(.settings-nav-column) {
    width: 12.5rem;
    flex-shrink: 0;
    position: sticky;
    top: 5.625rem;
    align-self: flex-start;
  }
  :global(.settings-main-column) {
    flex: 1 1 32rem;
    min-width: 0;
    max-width: 47.5rem;
  }
  :global(.profile-hero-text) {
    flex: 1;
    min-width: 0;
  }
  /* The section title already names the picture upload. */
  :global(.photo-section) :global(.avatar-upload) {
    margin: 0;
    padding: 0;
    border: 0;
  }
  :global(.photo-section) :global(.avatar-upload h3) {
    display: none;
  }
  :global(.danger-card) {
    border-color: color-mix(in srgb, var(--color-text-red) 35%, var(--color-border));
  }
  @media (max-width: 61.25rem) {
    :global(.settings-nav-column) {
      width: 100%;
      position: static;
    }
    :global(.settings-main-column) {
      flex-basis: 100%;
    }
  }
</style>
