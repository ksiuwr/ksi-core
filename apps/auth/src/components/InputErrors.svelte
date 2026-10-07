<script lang="ts">
  let { errors, show }: { errors: string[]; show: boolean } = $props();
</script>

<div class="relative">
  <div
    class="bg-base-100 text-error border-base-content/20 pointer-events-none absolute bottom-0 left-0 z-10 w-lg place-self-start border p-1"
    class:translate-y-[150%]={errors.length === 0 || !show}
    class:translate-y-0={errors.length !== 0 && show}
    class:opacity-0={errors.length === 0 || !show}
    class:opacity-100={errors.length !== 0 && show}
  >
    <b>Issues to fix:</b>
    {#each errors as error}
      <p>{error}</p>
    {/each}
  </div>
</div>
