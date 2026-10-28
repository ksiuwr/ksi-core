<script lang="ts">
  let { board = false, label }: { board?: boolean; label: string } = $props();
</script>

<div class="workspace-skeleton" role="status" aria-label={label}>
  <div class="skeleton-title"></div>
  <div class="skeleton-grid" class:board>
    {#each [1, 2, 3] as n (n)}<div class="skeleton-panel">
        <span></span><span></span><span></span>
      </div>{/each}
  </div>
</div>

<style>
  .workspace-skeleton {
    padding-top: 6px;
  }
  .skeleton-title {
    width: 220px;
    height: 30px;
    margin-bottom: 32px;
    background: var(--surface-muted);
    border-radius: var(--radius-md);
  }
  .skeleton-grid {
    display: grid;
    gap: 16px;
  }
  .skeleton-grid.board {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .skeleton-panel {
    height: 110px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .board .skeleton-panel {
    height: 330px;
  }
  .skeleton-panel span {
    height: 12px;
    max-width: 400px;
    background: var(--surface-muted);
    border-radius: var(--radius-sm);
  }
  .skeleton-panel span:last-child {
    width: 60%;
  }
  @media (max-width: 760px) {
    .skeleton-grid.board {
      grid-template-columns: 1fr;
    }
    .board .skeleton-panel {
      height: 180px;
    }
  }
</style>
