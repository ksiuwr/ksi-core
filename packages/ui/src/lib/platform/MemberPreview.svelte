<script lang="ts">
  import { tick, onMount } from 'svelte';
  let {
    member,
    href,
    role = '',
    avatarOnly = false,
    language = 'pl',
    size = 36,
    inline = false
  }: {
    member: {
      id: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      nickname?: string | null;
      image?: string | null;
      bio?: string | null;
    };
    href: string;
    role?: string;
    avatarOnly?: boolean;
    language?: 'pl' | 'en';
    size?: number;
    inline?: boolean;
  } = $props();
  const uid = $props.id();
  let touch = false;
  let anchor = $state<HTMLAnchorElement>(),
    card = $state<HTMLDivElement>();
  let open = $state(false),
    position = $state({ left: 0, top: 0, width: 280 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const name = $derived(
    [member.firstName || member.name, member.lastName].filter(Boolean).join(' ')
  );
  let brokenImage = $state(false);
  $effect(() => {
    member.image;
    brokenImage = false;
  });
  const initials = $derived(
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((_, index, words) => index === 0 || index === words.length - 1)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  );
  function cancelClose() {
    clearTimeout(timer);
  }
  function close() {
    cancelClose();
    card?.hidePopover();
    open = false;
  }
  function place() {
    if (!anchor || !card) return;
    const rect = anchor.getBoundingClientRect(),
      width = Math.min(300, window.innerWidth - 24),
      height = card.offsetHeight;
    const below = window.innerHeight - rect.bottom - 12;
    position = {
      width,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: below >= height ? rect.bottom + 4 : Math.max(12, rect.top - height - 4)
    };
  }
  async function show() {
    cancelClose();
    if (!card) return;
    card.showPopover();
    open = true;
    await tick();
    place();
  }
  function later() {
    if (card?.contains(document.activeElement) || anchor === document.activeElement) return;
    cancelClose();
    timer = setTimeout(close, 120);
  }
  onMount(() => () => cancelClose());
  $effect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const scroll = (event: Event) => {
      if (!(event.target instanceof Node && card?.contains(event.target))) close();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', scroll, true);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', scroll, true);
    };
  });
</script>

<div
  class="identity"
  class:inline
  role="group"
  aria-label={name}
  style:--avatar-size={`${size}px`}
  onpointerenter={(event) => {
    if (event.pointerType === 'mouse') void show();
  }}
  onpointerleave={later}
  onfocusin={() => void show()}
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) later();
  }}
>
  <a
    bind:this={anchor}
    class="person-link"
    class:avatar-only={avatarOnly}
    class:inline
    aria-label={avatarOnly ? name : undefined}
    {href}
    aria-expanded={open}
    aria-controls={`${uid}-preview`}
    onpointerdown={(event) => {
      touch = event.pointerType === 'touch' || event.pointerType === 'pen';
    }}
    onclick={(event) => {
      if (touch) {
        event.preventDefault();
        touch = false;
        void show();
      }
    }}
  >
    {#if member.image && !brokenImage}<img
        src={member.image}
        alt=""
        onerror={() => (brokenImage = true)}
      />{:else}<span class="initials">{initials}</span>{/if}
    {#if !avatarOnly}<span class="identity-text"
        >{name}{#if member.nickname}<small>aka. {member.nickname}</small>{/if}</span
      >
    {/if}
  </a>
  <div
    bind:this={card}
    id={`${uid}-preview`}
    class="hover-card"
    popover="auto"
    ontoggle={(event) => {
      open = event.newState === 'open';
    }}
    onpointerenter={cancelClose}
    onpointerleave={later}
    style:left={`${position.left}px`}
    style:top={`${position.top}px`}
    style:width={`${position.width}px`}
    aria-hidden={!open}
  >
    <div class="card-identity">
      {#if member.image && !brokenImage}<img
          src={member.image}
          alt=""
          onerror={() => (brokenImage = true)}
        />{:else}<span class="initials">{initials}</span>{/if}
      <div>
        <strong>{name}</strong>{#if member.nickname}<small>aka. {member.nickname}</small
          >{/if}{#if role}<small>{role}</small>{/if}
      </div>
    </div>
    <p class="bio">{member.bio || (language === 'pl' ? 'Brak biografii.' : 'No biography yet.')}</p>
    <a class="btn btn-outline" {href}>{language === 'pl' ? 'Zobacz profil' : 'View profile'}</a>
  </div>
</div>

<style>
  .identity.inline {
    display: inline;
  }
  .person-link {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--ink);
    text-decoration: none;
    width: fit-content;
  }
  .person-link.inline {
    display: inline-flex;
    gap: 6px;
    margin-inline-start: 4px;
    vertical-align: middle;
  }
  .person-link.inline .identity-text {
    display: inline;
  }
  .person-link.inline .identity-text small {
    display: none;
  }
  .avatar-only {
    border-radius: 50%;
    outline: 1px solid transparent;
    outline-offset: 3px;
  }
  .avatar-only:hover,
  .avatar-only:focus-visible {
    outline-color: var(--control-border-hover, var(--line));
  }
  .card-identity {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .card-identity > div {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .card-identity img {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .card-identity .initials {
    width: 44px;
    height: 44px;
  }
  .person-link img,
  .initials {
    width: var(--avatar-size, 36px);
    height: var(--avatar-size, 36px);
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .person-link.inline img,
  .person-link.inline .initials {
    outline: 1px solid transparent;
    outline-offset: 2px;
  }
  .person-link.inline .initials {
    font-size: 8px;
    font-weight: 700;
    line-height: 1;
  }
  .person-link.inline:hover img,
  .person-link.inline:focus-visible img,
  .person-link.inline:hover .initials,
  .person-link.inline:focus-visible .initials {
    outline-color: var(--control-border-hover, var(--line));
  }
  .initials {
    display: grid;
    place-items: center;
    background: var(--surface-muted);
    font-size: calc(var(--avatar-size, 36px) * 0.36);
    font-weight: 600;
    line-height: 1;
  }
  .card-identity .initials {
    font-size: 15px;
  }
  .identity-text {
    overflow-wrap: anywhere;
  }
  small {
    display: block;
    color: var(--muted);
    margin-top: 4px;
    font-size: 11px;
  }
  .hover-card {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 20px;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-md, 0 8px 24px #0002);
    border-radius: var(--radius-lg, 8px);
    max-height: calc(100vh - 24px);
    overflow: auto;
  }
  .hover-card p {
    margin: 8px 0;
  }
  .hover-card .btn {
    margin-top: 8px;
    font-size: 12px;
    padding: 8px 12px;
  }
  .bio {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 160px;
    overflow: auto;
    font-size: 13px;
  }
</style>
