<script lang="ts">
  import { Eye, EyeClosed } from '@lucide/svelte';
  import z from 'zod';
  import InputErrors from '../../../components/InputErrors.svelte';
  import { toast } from 'svelte-sonner';
  import { authClient } from '$lib/auth-client';
  import { getUrls } from 'shared';

  let formState = $state({
    email: '',
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    passwordShown: false,
    confirmPasswordShown: false,
    usernameAvailable: false
  });

  let errors = $state<{
    email: string[];
    name: string[];
    username: string[];
    password: string[];
    confirmPassword: string[];
  }>({
    email: [],
    name: [],
    username: [],
    password: [],
    confirmPassword: []
  });

  let focused = $state({
    email: false,
    name: false,
    username: false,
    password: false,
    confirmPassword: false
  });

  let validate = {
    email: () => {
      try {
        z.email().max(64, { message: 'Too long, maximum: 64 characters' }).parse(formState.email);
      } catch (e) {
        if (e instanceof z.ZodError) {
          return z.treeifyError(e).errors;
        }
      }

      return [];
    },
    name: () => {
      try {
        z.string()
          .min(3, { message: 'Too short, minimum: 3 characters' })
          .max(32, { message: 'Too long, maximum: 32 characters' })
          .parse(formState.name);
      } catch (e) {
        if (e instanceof z.ZodError) {
          return z.treeifyError(e).errors;
        }
      }
      return [];
    },
    username: async () => {
      try {
        z.string()
          .min(3, { message: 'Too short, minimum: 3 characters' })
          .max(30, { message: 'Too long, maximum: 30 characters' })
          .parse(formState.username);
      } catch (e) {
        if (e instanceof z.ZodError) {
          return z.treeifyError(e).errors;
        }
      }

      return await authClient
        .isUsernameAvailable({
          username: formState.username
        })
        .then((r) => {
          if (r.data?.available) {
            return [];
          }
          return ['This username is taken'];
        })
        .catch((e) => {
          return ['An unknown error has occurred during username availability check'];
        });
    },
    password: () => {
      try {
        z.string()
          .min(6, { message: 'Too short, minimum: 6 characters' })
          .max(32, { message: 'Too long, maximum: 32 characters' })
          .refine((password) => /[A-Z]/.test(password), {
            message: 'Missing an uppercase letter'
          })
          .refine((password) => /[a-z]/.test(password), {
            message: 'Missing an lowercase letter'
          })
          .refine((password) => /[0-9]/.test(password), { message: 'Missing a digit' })
          .refine((password) => /[!@#$%^&*-?]/.test(password), {
            message: 'Missing a special character (!@#$%^&*-?)'
          })
          .parse(formState.password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          return z.treeifyError(e).errors;
        }
      }
      return [];
    },
    confirmPassword: () => {
      if (formState.confirmPassword !== formState.password) return ['Differs from chosen password'];
      return [];
    }
  };

  let usernameTimeout: ReturnType<typeof setTimeout>;

  let blurred = {
    email: () => (errors.email = validate.email()),
    name: () => (errors.name = validate.name()),
    username: () => {
      clearTimeout(usernameTimeout);
      usernameTimeout = setTimeout(async () => {
        formState.usernameAvailable = false;
        const _errors = await validate.username();
        if (_errors.length === 0) formState.usernameAvailable = true;
        errors.username = _errors;
      }, 300);
    },
    password: () => (errors.password = validate.password()),
    confirmPassword: () => (errors.confirmPassword = validate.confirmPassword())
  };

  let formValid = $derived(
    validate.email().length === 0 &&
      validate.name().length === 0 &&
      validate.password().length === 0 &&
      validate.confirmPassword().length === 0 &&
      formState.usernameAvailable
  );
</script>

<div>
  <h2>Create a KSI Account</h2>

  <p class="text-sm">
    Already have an account?
    <a href="/sign-in" class="text-primary underline"> Sign in </a> here.
  </p>
</div>

<form
  class="flex flex-col gap-2"
  onsubmit={() => {
    if (!formValid) return toast.error('Fix the errors in input fields before submitting');
    authClient.signUp
      .email({
        email: formState.email,
        name: formState.name,
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
    <p class="fieldset-legend">Name</p>
    <InputErrors errors={errors.name} show={focused.name} />
    <input
      type="text"
      class={['input w-full', errors.name.length !== 0 && 'border-error! border']}
      placeholder="Name"
      bind:value={formState.name}
      onfocus={() => (focused.name = true)}
      oninput={blurred.name}
      onblur={() => (focused.name = false)}
    />
  </fieldset>

  <fieldset class="fieldset">
    <p class="fieldset-legend">Username</p>
    <InputErrors errors={errors.username} show={focused.username} />
    <input
      type="text"
      class={[
        'input w-full',
        errors.username.length !== 0 && 'border-error! border',
        formState.usernameAvailable && 'border-success! border'
      ]}
      placeholder="Username"
      bind:value={formState.username}
      onfocus={() => (focused.username = true)}
      oninput={blurred.username}
      onblur={() => (focused.username = false)}
    />
    {#if formState.usernameAvailable}
      <span class="text-success font-bold">Username is available!</span>
    {/if}
  </fieldset>

  <fieldset class="fieldset">
    <p class="fieldset-legend">E-mail</p>
    <InputErrors errors={errors.email} show={focused.email} />
    <input
      type="email"
      class={['input w-full', errors.email.length !== 0 && 'border-error! border']}
      placeholder="E-mail"
      bind:value={formState.email}
      onfocus={() => (focused.email = true)}
      oninput={blurred.email}
      onblur={() => (focused.email = false)}
    />
  </fieldset>

  <div class="flex flex-row gap-2">
    <fieldset class="fieldset">
      <p class="fieldset-legend">Password</p>

      <InputErrors errors={errors.password} show={focused.password} />
      <div class="flex w-full">
        <input
          type={formState.passwordShown ? 'text' : 'password'}
          class={['input w-full', errors.password.length !== 0 && 'border-error! border']}
          placeholder="Password"
          bind:value={formState.password}
          onfocus={() => (focused.password = true)}
          oninput={blurred.password}
          onblur={() => (focused.password = false)}
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

    <fieldset class="fieldset">
      <p class="fieldset-legend">Confirm Password</p>

      <InputErrors errors={errors.confirmPassword} show={focused.confirmPassword} />
      <div class="flex w-full">
        <input
          type={formState.confirmPasswordShown ? 'text' : 'password'}
          class={['input w-full', errors.confirmPassword.length !== 0 && 'border-error! border']}
          placeholder="Confirm Password"
          bind:value={formState.confirmPassword}
          onfocus={() => (focused.confirmPassword = true)}
          oninput={blurred.confirmPassword}
          onblur={() => (focused.confirmPassword = false)}
        />
        <button
          class="btn btn-square btn-outline align-self-center border-border border-input h-full"
          type="button"
          onclick={() => (formState.confirmPasswordShown = !formState.confirmPasswordShown)}
        >
          {#if formState.confirmPasswordShown}
            <Eye class="size-3" />
          {:else}
            <EyeClosed class="size-3" />
          {/if}
        </button>
      </div>
    </fieldset>
  </div>

  <button disabled={!formValid} class="btn btn-neutral mt-2 w-full" type="submit">Sign up</button>
</form>
