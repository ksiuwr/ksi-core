<script lang="ts">
  import AvatarUpload, { type AvatarRequest } from '$lib/AvatarUpload.svelte';
  import ContentTranslations from '$lib/ContentTranslations.svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import SettingsNav from '$lib/SettingsNav.svelte';
  import { api, errorMessage } from '$lib/api';
  import { untrack } from 'svelte';
  import { validProfileLink } from 'shared/profile-links';
  import type { Profile } from 'shared/types';
  import {
    ArrowUpRight,
    Check,
    Github,
    Image as ImageIcon,
    Languages,
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
    language,
    refresh
  }: {
    profile: Profile;
    avatarRequest: AvatarRequest | null;
    activeSessions: Session[];
    websiteOrigin: string;
    language: 'pl' | 'en';
    refresh: () => Promise<void>;
  } = $props();

  let draft = $state<Profile>(untrack(() => ({ ...profile })));
  let sessions = $state<Session[]>(untrack(() => [...activeSessions]));
  let busy = $state(false);
  let saved = $state(false);
  let dirty = $state(false);
  let error = $state('');

  const privacyOptions = $derived([
    { value: 'full-name', label: 'Full name' },
    { value: 'last-initial', label: 'First name + last initial' },
    { value: 'initials', label: 'Initials only' }
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
      error = 'Enter a https://github.com/username profile link.';
      return;
    }
    if (!validProfileLink('linkedin', draft.linkedin)) {
      error = 'Enter a https://linkedin.com/in/username profile link.';
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
    <h1>{'Profile'}</h1>
    <p>{'Introduce yourself to the association and choose what to share publicly.'}</p>
  </div>
  <a class="btn btn-outline" href={`${websiteOrigin}/members/${encodeURIComponent(draft.id)}`}
    ><ArrowUpRight size={15} aria-hidden="true" />{'View public profile'}</a
  >
</div>

<div class="settings-layout">
  <SettingsNav
    label={'Profile sections'}
    items={[
      { id: 'about', label: 'About you', icon: UserRound },
      { id: 'photo', label: 'Profile picture', icon: ImageIcon },
      { id: 'links', label: 'Find me online', icon: Link2 },
      { id: 'translations', label: 'Public translations', icon: Languages },
      { id: 'sessions', label: 'Active sessions', icon: Laptop },
      { id: 'danger', label: 'Delete account', icon: Trash2, danger: true }
    ]}
  />

  <div class="settings-main">
    <form
      class="settings-main"
      onsubmit={(event) => {
        event.preventDefault();
        saveProfile();
      }}
      oninput={() => {
        saved = false;
        dirty = true;
      }}
    >
      {#if error}<p class="error" role="alert">{error}</p>{/if}

      <section class="profile-hero card" aria-label={'Public profile'}>
        {#if draft.image}<img src={draft.image} alt="" class="profile-avatar" />{:else}<span
            class="profile-avatar"
            >{`${draft.firstName?.[0] ?? ''}${draft.lastName?.[0] ?? ''}`.toUpperCase() ||
              'K'}</span
          >{/if}
        <div class="profile-hero-text">
          <strong>{publicName}</strong>
          {#if draft.nickname?.trim()}<span class="profile-nickname">aka. {draft.nickname}</span
            >{/if}
          <p>{draft.bio || 'Your public profile on the KSI website.'}</p>
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
        <header><h2 id="identity-heading">{'About you'}</h2></header>
        <div class="card settings-card">
          <div class="field-grid">
            <div>
              <label for="p-first">{'First name'}</label><input
                id="p-first"
                bind:value={draft.firstName}
                required
              />
            </div>
            <div>
              <label for="p-last">{'Last name'}</label><input
                id="p-last"
                bind:value={draft.lastName}
              />
            </div>
            <div class="field-wide">
              <label for="p-nick">{'Nickname'}</label><input
                id="p-nick"
                bind:value={draft.nickname}
                placeholder={'What should we call you?'}
              />
            </div>
            <div class="field-wide">
              <label for="p-bio">{'A little about you'}</label><textarea
                id="p-bio"
                bind:value={draft.bio}
                rows="4"
                placeholder={'Interests, projects, and things you enjoy…'}
              ></textarea>
            </div>
            <div class="field-wide">
              <label for="p-priv">{'Name visibility'}</label>
              <Dropdown
                id="p-priv"
                label={'Name visibility'}
                value={draft.publicPrivacy}
                options={privacyOptions}
                onselect={(value) => {
                  draft.publicPrivacy = value as Profile['publicPrivacy'];
                  saved = false;
                  dirty = true;
                }}
              />
              <p class="field-help">
                {'Applies to the public website. Members see your full name in the dashboard.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="photo" class="settings-section photo-section" aria-label={'Profile picture'}>
        <header><h2>{'Profile picture'}</h2></header>
        <div class="card settings-card">
          <AvatarUpload
            request={avatarRequest}
            {language}
            onchange={refresh}
            reportError={(message) => (error = message)}
          />
        </div>
      </section>

      <section id="links" class="settings-section" aria-labelledby="links-heading">
        <header><h2 id="links-heading">{'Find me online'}</h2></header>
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
                  {'Use a https://github.com/username link.'}
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
                  {'Use a https://linkedin.com/in/username link.'}
                </p>{/if}
            </div>
          </div>
        </div>
      </section>

      {#if dirty || saved}
        <div class="save-bar">
          <span role="status"
            >{#if saved}<Check
                size={15}
                aria-hidden="true"
              />{'Saved'}{:else}{'Unsaved changes'}{/if}</span
          >
          <button class="btn" disabled={busy}
            ><Save size={16} aria-hidden="true" />{'Save changes'}</button
          >
        </div>
      {/if}
    </form>

    <section id="translations" class="settings-section">
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
        {language}
        onsaved={(result) => {
          draft.translations = result.translations;
        }}
      />
    </section>

    <section id="sessions" class="settings-section" aria-labelledby="sessions-heading">
      <header>
        <h2 id="sessions-heading">{'Active sessions'}</h2>
        <p>{'Devices and browsers currently logged into your KSI account.'}</p>
      </header>
      {#if sessions.length === 0}
        <p class="list-empty">{'No active sessions.'}</p>
      {:else}
        <ul class="list-group">
          {#each sessions as session (session.id)}
            <li class="session-row">
              <Laptop size={16} aria-hidden="true" />
              <div class="session-info">
                <div class="session-title">
                  <strong>{session.isCurrent ? 'Current device' : 'Other device'}</strong>
                  {#if session.isCurrent}<span class="session-badge">{'Current'}</span>{/if}
                </div>
                <div class="muted session-detail">
                  {session.userAgent || 'Unknown browser'}
                  {#if session.ipAddress}
                    · {session.ipAddress}
                  {/if}
                </div>
              </div>
              {#if !session.isCurrent}
                <button
                  class="btn btn-outline btn-sm"
                  disabled={busy}
                  onclick={() => revokeSession(session.id)}>{'Revoke'}</button
                >
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section id="danger" class="settings-section" aria-labelledby="danger-heading">
      <header><h2 id="danger-heading">{'Delete account'}</h2></header>
      <div class="card settings-card danger">
        <p class="muted">{'Your profile will be anonymized. Association content remains.'}</p>
        <div>
          <button class="btn btn-outline danger-button" disabled={busy} onclick={deleteAccount}
            >{'Confirm account deletion'}</button
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
  #translations :global(.translations) {
    margin: 0;
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
