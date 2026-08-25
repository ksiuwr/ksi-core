<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { authClient } from '$lib/auth-client';
  import { pastUsersStore } from '$lib/pastUsersStore';
  import { SiDiscord, SiGoogle } from '@icons-pack/svelte-simple-icons';
  import { Eye, EyeClosed, Trash } from '@lucide/svelte';
  import { getUrls } from 'shared';

  let { children } = $props();

  let isSignIn = $derived(page.route.id === '/(flow)/sign-in');
</script>

<div class="flex min-h-screen w-full flex-col items-center gap-6 py-4 md:py-10 lg:gap-10 lg:py-20">
  <!-- @wc-ignore -->
  <a href={getUrls().frontend.landing} class="font-b flex items-center text-xl lg:text-2xl">
    <img src="/logo.svg" class="mr-2 size-6 lg:size-10 dark:invert" alt="Logo KSI" />
    <span class="text-primary">ksi</span>.auth
  </a>
  <div class="border-muted/40 relative border">
    <div class="absolute top-0 left-full -mt-px flex flex-col items-start gap-px">
      <button
        onclick={() => {
          goto('/sign-in');
        }}
        class={[
          'border-muted/40 bg-base-100 flex w-8 items-center justify-center border py-4 transition-all',
          isSignIn
            ? 'border-l-0'
            : 'text-muted hover:text-base-content cursor-pointer opacity-80 hover:w-9 hover:opacity-100'
        ]}
      >
        <div class="text-nowrap [writing-mode:vertical-rl]">SIGN IN</div>
      </button>
      <button
        onclick={() => {
          goto('/sign-up');
        }}
        class={[
          'border-muted/40 bg-base-100 flex w-8 items-center justify-center border py-4 transition-all',
          !isSignIn
            ? 'border-l-0'
            : 'text-muted hover:text-base-content cursor-pointer opacity-80 hover:w-9 hover:opacity-100'
        ]}
      >
        <div class="text-nowrap [writing-mode:vertical-rl]">SIGN UP</div>
      </button>
    </div>
    <div class="flex gap-12 p-8 not-lg:flex-col">
      {#if $pastUsersStore.length > 0}
        <div class="flex flex-col gap-4">
          <div>
            <h2>Welcome back</h2>
            <p class="text-muted">Choose one of your previous sessions</p>
          </div>

          <div class="flex w-full items-center justify-between">
            <h3>Previous sessions</h3>
            <button
              onclick={pastUsersStore.forgetAll}
              class="text-danger flex cursor-pointer items-center gap-2"
            >
              Clear history <Trash class="size-4" />
            </button>
          </div>
          <div class="flex max-h-92 w-full flex-col gap-1 overflow-scroll">
            {#each $pastUsersStore as pastUser (pastUser.username)}
              <div class="border-muted flex justify-between border p-2">
                <div class="flex flex-col">
                  <div class="flex gap-1">
                    <img
                      src={pastUser.avatarUrl}
                      alt={`${pastUser.username}'s avatar`}
                      class="size-8"
                    />
                    <b class="text-lg">{pastUser.username}</b>
                  </div>
                  <p class="text-muted">
                    Last signed in at: {pastUser.lastLoggedInDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      <div class="flex w-lg max-w-xl flex-col gap-6">
        {@render children()}

        <div class="grid grid-cols-2">
          <button
            onclick={() => {
              authClient.signIn.social({
                provider: 'discord',
                callbackURL: getUrls().frontend.auth
              });
            }}
            class="btn btn-outline btn-lg"
          >
            <SiDiscord class="size-4" />
          </button>
          <button
            onclick={() => {
              authClient.signIn.social({
                provider: 'google',
                callbackURL: getUrls().frontend.auth
              });
            }}
            class="btn btn-outline btn-lg"
          >
            <SiGoogle class="size-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
