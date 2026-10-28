<script lang="ts">
  import AvatarUpload, { type AvatarRequest } from '$lib/AvatarUpload.svelte';
  import ContentTranslations from '$lib/ContentTranslations.svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import { api, errorMessage } from '$lib/api';
  import { untrack } from 'svelte';
  import { validProfileLink } from 'shared/profile-links';
  import type { Profile } from 'shared/types';
  import {
    ArrowUpRight,
    Check,
    ChevronDown,
    Github,
    Laptop,
    Linkedin,
    Save,
    Shield,
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

<form
  class="profile-form"
  onsubmit={(event) => {
    event.preventDefault();
    saveProfile();
  }}
  oninput={() => (saved = false)}
>
  <div class="workspace-header">
    <div>
      <h1>{'Profile'}</h1>
      <p class="workspace-description">
        {'Introduce yourself to the association and choose what to share publicly.'}
      </p>
    </div>
    <div class="profile-save">
      <span role="status"
        >{#if saved}<Check size={15} aria-hidden="true" />{'Saved'}{/if}</span
      ><button class="btn" disabled={busy}
        ><Save size={16} aria-hidden="true" />{'Save changes'}</button
      >
    </div>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <div class="profile-grid">
    <section class="profile-section profile-identity" aria-labelledby="identity-heading">
      <div class="section-heading">
        <UserRound size={18} aria-hidden="true" />
        <h2 id="identity-heading">{'About you'}</h2>
      </div>
      <div class="profile-fields">
        <div>
          <label for="p-first">{'First name'}</label><input
            id="p-first"
            bind:value={draft.firstName}
            required
          />
        </div>
        <div>
          <label for="p-last">{'Last name'}</label><input id="p-last" bind:value={draft.lastName} />
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
            placeholder={'Interests, projects, and things you enjoy…'}
          ></textarea>
        </div>
      </div>
      <a class="btn btn-outline" href={`${websiteOrigin}/members/${encodeURIComponent(draft.id)}`}
        ><ArrowUpRight size={15} />{'View public profile'}</a
      >
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
      <AvatarUpload
        request={avatarRequest}
        {language}
        onchange={refresh}
        reportError={(message) => (error = message)}
      />
    </section>
    <section class="profile-section profile-preview" aria-labelledby="preview-heading">
      <div class="section-heading">
        <Shield size={18} aria-hidden="true" />
        <h2 id="preview-heading">{'Public profile'}</h2>
      </div>
      <div class="profile-preview-card">
        {#if draft.image}<img src={draft.image} alt="" class="profile-avatar" />{:else}<span
            class="profile-avatar"
            >{`${draft.firstName?.[0] ?? ''}${draft.lastName?.[0] ?? ''}`.toUpperCase() ||
              'K'}</span
          >{/if}<strong>{publicName}</strong>
        {#if draft.nickname?.trim()}<span class="profile-nickname">aka. {draft.nickname}</span>{/if}
        <p>{draft.bio || 'Your public profile on the KSI website.'}</p>
        <div class="profile-socials">
          {#if draft.github && validProfileLink('github', draft.github)}<a
              class="btn btn-outline"
              href={draft.github}
              target="_blank"
              rel="noopener noreferrer"><Github size={15} />GitHub</a
            >{/if}
          {#if draft.linkedin && validProfileLink('linkedin', draft.linkedin)}<a
              class="btn btn-outline"
              href={draft.linkedin}
              target="_blank"
              rel="noopener noreferrer"><Linkedin size={15} />LinkedIn</a
            >{/if}
        </div>
      </div>
      <label for="p-priv">{'Name visibility'}</label>
      <Dropdown
        id="p-priv"
        label={'Name visibility'}
        value={draft.publicPrivacy}
        options={privacyOptions}
        onselect={(value) => {
          draft.publicPrivacy = value as Profile['publicPrivacy'];
          saved = false;
        }}
      />
      <p class="field-help">
        {'Applies to the public website. Members see your full name in the dashboard.'}
      </p>
    </section>
    <section class="profile-section profile-links" aria-labelledby="links-heading">
      <div class="section-heading">
        <ArrowUpRight size={18} aria-hidden="true" />
        <h2 id="links-heading">{'Find me online'}</h2>
      </div>
      <div class="profile-fields">
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
          {#if !validProfileLink('linkedin', draft.linkedin)}<p class="field-error" role="status">
              {'Use a https://linkedin.com/in/username link.'}
            </p>{/if}
        </div>
      </div>
    </section>
  </div>
</form>

<section class="profile-section account-danger" style="margin-top: 16px;">
  <details>
    <summary
      ><Laptop size={17} aria-hidden="true" />{'Active sessions'}<ChevronDown
        size={15}
        aria-hidden="true"
      /></summary
    >
    <p class="field-help">{'Devices and browsers currently logged into your KSI account.'}</p>
    {#if sessions.length === 0}
      <p class="muted" style="margin-top: 12px; font-size: 13px;">{'No active sessions.'}</p>
    {:else}
      <div class="session-list">
        {#each sessions as session (session.id)}
          <div class="session-row">
            <div>
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
                class="btn btn-outline session-revoke"
                disabled={busy}
                onclick={() => revokeSession(session.id)}>{'Revoke'}</button
              >
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </details>
</section>

<section class="profile-section account-danger">
  <details>
    <summary
      ><Trash2 size={17} aria-hidden="true" />{'Delete account'}<ChevronDown
        size={15}
        aria-hidden="true"
      /></summary
    >
    <p class="field-help">{'Your profile will be anonymized. Association content remains.'}</p>
    <button class="btn btn-outline danger-button" disabled={busy} onclick={deleteAccount}
      >{'Confirm account deletion'}</button
    >
  </details>
</section>

<style>
  .session-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
  }
  .session-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 4px;
    font-size: 13px;
  }
  .session-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .session-badge {
    font-size: 10px;
    padding: 2px 6px;
    background: var(--primary);
    color: white;
    border-radius: 3px;
  }
  .session-detail {
    font-size: 11px;
    margin-top: 4px;
  }
  .session-revoke {
    font-size: 12px;
    padding: 4px 10px;
  }
</style>
