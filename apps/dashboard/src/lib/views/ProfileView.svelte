<script lang="ts">
  import AvatarUpload, { type AvatarRequest } from '$lib/AvatarUpload.svelte';
  import ContentTranslations from '$lib/ContentTranslations.svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import SettingsNav from '$lib/SettingsNav.svelte';
  import { api, errorMessage } from '$lib/api';
  import { untrack } from 'svelte';
  import { validProfileLink } from 'shared/profile-links';
  import { summarizeUserAgent } from 'shared/user-agent';
  import { primaryContentLocale, type ContentLocale } from 'shared/content-locales';
  import type { Profile } from 'shared/types';
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

<div class="workspace-header">
  <div>
    <h1>Profil</h1>
    <p>Przedstaw się kołu i wybierz, czym chcesz się podzielić publicznie.</p>
  </div>
  <a class="btn btn-outline" href={`${websiteOrigin}/members/${encodeURIComponent(draft.id)}`}
    ><ArrowUpRight size={15} aria-hidden="true" />Zobacz publiczny profil</a
  >
</div>

<div class="settings-layout">
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

  <div class="settings-main">
    <form
      class="settings-main"
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
      {#if error}<p class="error" role="alert">{error}</p>{/if}

      <section class="profile-hero card" aria-label={'Profil publiczny'}>
        {#if draft.image}<img src={draft.image} alt="" class="profile-avatar" />{:else}<span
            class="profile-avatar"
            >{`${draft.firstName?.[0] ?? ''}${draft.lastName?.[0] ?? ''}`.toUpperCase() ||
              'K'}</span
          >{/if}
        <div class="profile-hero-text">
          <strong>{publicName}</strong>
          {#if draft.nickname?.trim()}<span class="profile-nickname">aka. {draft.nickname}</span
            >{/if}
          <p>{draft.bio || 'Twój publiczny profil na stronie KSI.'}</p>
        </div>
        <div class="profile-socials">
          {#if draft.github && validProfileLink('github', draft.github)}<a
              class="btn btn-outline btn-sm"
              href={draft.github}
              target="_blank"
              rel="noopener noreferrer"><Github size={14} />GitHub</a
            >{/if}
          {#if draft.linkedin && validProfileLink('linkedin', draft.linkedin)}<a
              class="btn btn-outline btn-sm"
              href={draft.linkedin}
              target="_blank"
              rel="noopener noreferrer"><Linkedin size={14} />LinkedIn</a
            >{/if}
        </div>
      </section>

      <section id="about" class="settings-section" aria-labelledby="identity-heading">
        <header><h2 id="identity-heading">O Tobie</h2></header>
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
        <div class="card settings-card">
          <div class="field-grid localized-profile-fields">
            <div>
              <label for="p-first">Imię</label><input
                id="p-first"
                bind:value={
                  () => localized('firstName'), (value) => setLocalized('firstName', value)
                }
                required={contentLocale === primaryContentLocale}
              />
            </div>
            <div>
              <label for="p-last">Nazwisko</label><input
                id="p-last"
                bind:value={() => localized('lastName'), (value) => setLocalized('lastName', value)}
              />
            </div>
            <div class="field-wide">
              <label for="p-nick">Pseudonim</label><input
                id="p-nick"
                bind:value={() => localized('nickname'), (value) => setLocalized('nickname', value)}
                placeholder={'Jak mamy się do ciebie zwracać?'}
              />
            </div>
            <div class="field-wide">
              <label for="p-bio">Kilka słów o sobie</label><textarea
                id="p-bio"
                bind:value={() => localized('bio'), (value) => setLocalized('bio', value)}
                rows="4"
                placeholder={'Zainteresowania, projekty, rzeczy, które lubisz…'}
              ></textarea>
            </div>
            {#if contentLocale === primaryContentLocale}<div class="field-wide">
                <label for="p-priv">Widoczność imienia i nazwiska</label>
                <Dropdown
                  id="p-priv"
                  label={'Widoczność imienia i nazwiska'}
                  value={draft.publicPrivacy}
                  options={privacyOptions}
                  onselect={(value) => {
                    draft.publicPrivacy = value as Profile['publicPrivacy'];
                    saved = false;
                    dirty = true;
                  }}
                />
                <p class="field-help">
                  Dotyczy publicznej strony internetowej. Członkowie widzą twoje imię i nazwisko w
                  panelu.
                </p>
              </div>{/if}
          </div>
        </div>
      </section>

      <section id="photo" class="settings-section photo-section" aria-label={'Zdjęcie profilowe'}>
        <header><h2>Zdjęcie profilowe</h2></header>
        <div class="card settings-card">
          <AvatarUpload
            request={avatarRequest}
            onchange={refresh}
            reportError={(message) => (error = message)}
          />
        </div>
      </section>

      <section id="links" class="settings-section" aria-labelledby="links-heading">
        <header><h2 id="links-heading">Znajdź mnie w sieci</h2></header>
        <div class="card settings-card">
          <div class="field-grid">
            <div>
              <label for="p-gh"><Github size={14} aria-hidden="true" />GitHub</label><input
                id="p-gh"
                type="url"
                bind:value={draft.github}
                placeholder="https://github.com/…"
              />
              {#if !validProfileLink('github', draft.github)}<p class="field-error" role="status">
                  Użyj linku https://github.com/username.
                </p>{/if}
            </div>
            <div>
              <label for="p-li"><Linkedin size={14} aria-hidden="true" />LinkedIn</label><input
                id="p-li"
                type="url"
                bind:value={draft.linkedin}
                placeholder="https://linkedin.com/in/…"
              />
              {#if !validProfileLink('linkedin', draft.linkedin)}<p
                  class="field-error"
                  role="status"
                >
                  Użyj linku https://linkedin.com/in/username.
                </p>{/if}
            </div>
          </div>
        </div>
      </section>

      {#if contentLocale === primaryContentLocale && (dirty || saved)}
        <div class="save-bar">
          <span role="status"
            >{#if saved}<Check size={15} aria-hidden="true" />Zapisano{:else}Niezapisane zmiany{/if}</span
          >
          <button class="btn" disabled={busy}
            ><Save size={16} aria-hidden="true" />Zapisz zmiany</button
          >
        </div>
      {/if}
    </form>

    <section id="sessions" class="settings-section" aria-labelledby="sessions-heading">
      <header>
        <h2 id="sessions-heading">Aktywne sesje</h2>
        <p>Urządzenia i przeglądarki aktualnie zalogowane na Twoje konto KSI.</p>
      </header>
      {#if sessions.length === 0}
        <p class="list-empty">Brak aktywnych sesji.</p>
      {:else}
        <ul class="list-group">
          {#each sessions as session (session.id)}
            {@const client = summarizeUserAgent(session.userAgent)}
            <li class="session-row">
              <Laptop size={16} aria-hidden="true" />
              <div class="session-info">
                <div class="session-title">
                  <strong>{session.isCurrent ? 'Bieżące urządzenie' : 'Inne urządzenie'}</strong>
                  {#if session.isCurrent}<span class="session-badge">Bieżąca</span>{/if}
                </div>
                <div class="muted session-detail" title={session.userAgent || undefined}>
                  {#if client.browser && client.os}
                    {client.browser} na {client.os}
                  {:else if client.browser}
                    {client.browser}
                  {:else}
                    Nieznana przeglądarka
                  {/if}
                  {#if session.ipAddress}
                    · {session.ipAddress}
                  {/if}
                </div>
              </div>
              {#if !session.isCurrent}
                <button
                  class="btn btn-outline btn-sm"
                  disabled={busy}
                  onclick={() => revokeSession(session.id)}>Odwołaj</button
                >
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section id="danger" class="settings-section" aria-labelledby="danger-heading">
      <header><h2 id="danger-heading">Usuń konto</h2></header>
      <div class="card settings-card danger">
        <p class="muted">Twój profil zostanie zanonimizowany. Treści koła pozostaną.</p>
        <div>
          <button class="btn btn-outline danger-button" disabled={busy} onclick={deleteAccount}
            >Potwierdzam usunięcie konta</button
          >
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .profile-hero {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
  }
  .profile-hero .profile-avatar {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    margin: 0;
    border-radius: var(--radius-lg);
    object-fit: cover;
    font-size: 17px;
  }
  .profile-hero-text {
    flex: 1;
    min-width: 0;
  }
  .profile-hero-text strong {
    font-size: 15px;
  }
  .profile-hero-text .profile-nickname {
    margin-left: 6px;
  }
  .profile-hero-text p {
    margin-top: 2px;
    color: var(--muted);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .profile-hero .profile-socials {
    margin: 0;
    flex-wrap: nowrap;
  }
  /* The section title already names the picture upload. */
  .photo-section :global(.avatar-upload) {
    margin: 0;
    padding: 0;
    border: 0;
  }
  .photo-section :global(.avatar-upload h3) {
    display: none;
  }
  .session-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    font-size: 13px;
  }
  .session-row > :global(svg) {
    flex-shrink: 0;
    color: var(--muted);
  }
  .session-info {
    flex: 1;
    min-width: 0;
  }
  .session-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .session-badge {
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
    font-size: 10px;
  }
  .session-detail {
    margin-top: 2px;
    font-size: 11px;
    overflow-wrap: anywhere;
  }
  @media (max-width: 640px) {
    .profile-hero {
      flex-wrap: wrap;
    }
    .profile-hero .profile-socials {
      width: 100%;
    }
  }
</style>
