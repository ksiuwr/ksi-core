<script>
  import { authClient } from '$lib/auth-client';
  import { pastUsersStore } from '$lib/pastUsersStore';
  import { SiDiscord, SiGoogle } from '@icons-pack/svelte-simple-icons';
  import { Eye, EyeClosed, Trash } from '@lucide/svelte';
  import { getUrls } from 'shared';
  import { toast } from 'svelte-sonner';

  let formState = $state({
    username: '',
    password: '',
    passwordShown: false
  });

  let formFilled = $derived(formState.username !== '' && formState.password !== '');
</script>

<div>
  <h2>Sign into your KSI Account</h2>

  <p class="text-sm">
    Don't have an account yet?
    <a href="/sign-up" class="text-primary underline"> Sign up </a> here.
  </p>
</div>

<form
  class="flex flex-col gap-2"
  onsubmit={() => {
    authClient.signIn
      .username({
        username: formState.username,
        password: formState.password,
        callbackURL: getUrls().frontend.auth
      })
      .then((r) => {
        if (r.data) {
          return;
        }
        toast.error(r.error?.message || 'An unknown error occurred while creating your account.');
      });
  }}
>
  <fieldset class="fieldset">
    <p class="fieldset-legend">Username</p>
    <input
      type="text"
      class="input w-full"
      placeholder="Username"
      bind:value={formState.username}
    />
  </fieldset>

  <fieldset class="fieldset">
    <p class="fieldset-legend">Password</p>

    <div class="flex w-full">
      <input
        type={formState.passwordShown ? 'text' : 'password'}
        class="input w-full"
        placeholder="Password"
        bind:value={formState.password}
      />
      <button
        class="btn btn-square btn-outline align-self-center border-border border-input h-full"
        type="button"
        onclick={() => (formState.passwordShown = !formState.passwordShown)}
      >
        {#if formState.passwordShown}
          <Eye class="size-3" />
        {:else}
          <EyeClosed class="size-3" />
        {/if}
      </button>
    </div>
  </fieldset>

  <button disabled={!formFilled} class="btn btn-neutral mt-2 w-full" type="submit">Sign in</button>
</form>
