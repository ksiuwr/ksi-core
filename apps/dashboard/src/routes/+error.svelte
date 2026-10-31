<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} · Panel KSI</title>
</svelte:head>

<div class="pending-screen">
  <div class="pending-card">
    <div class="eyebrow" style="justify-content: center; margin-bottom: 16px;">
      <span class="dot" style="background: var(--coral);"></span>
      Błąd {page.status}
    </div>
    <h1>{page.status === 401 || page.status === 403 ? 'Błąd uwierzytelniania' : 'Błąd'}</h1>
    <p>
      {page.error?.message || 'Wystąpił nieoczekiwany błąd podczas żądania.'}
    </p>
    <a href="/" class="btn" style="text-decoration: none;">Wróć do Panelu</a>
  </div>
</div>
