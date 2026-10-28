<script lang="ts">
  let {
    open,
    title,
    message = '',
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    busy = false,
    onconfirm,
    onclose
  }: {
    open: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    busy?: boolean;
    onconfirm: () => void;
    onclose: () => void;
  } = $props();
  const uid = $props.id();
  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  function requestClose() {
    if (!busy) onclose();
  }
</script>

<dialog
  bind:this={dialog}
  class="confirm-dialog"
  aria-labelledby={`${uid}-title`}
  aria-describedby={message ? `${uid}-message` : undefined}
  oncancel={(event) => {
    event.preventDefault();
    requestClose();
  }}
  {onclose}
>
  <div class="confirm-body">
    <h2 id={`${uid}-title`}>{title}</h2>
    {#if message}<p id={`${uid}-message`}>{message}</p>{/if}
  </div>
  <div class="confirm-actions">
    <button type="button" class="btn btn-outline" disabled={busy} onclick={requestClose}
      >{cancelLabel}</button
    >
    <button type="button" class="btn danger-button" disabled={busy} onclick={() => onconfirm()}
      >{confirmLabel}</button
    >
  </div>
</dialog>

<style>
  .confirm-dialog {
    width: min(420px, calc(100vw - 32px));
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-lg);
  }
  .confirm-dialog::backdrop {
    background: rgb(12 13 15 / 0.42);
    backdrop-filter: blur(2px);
  }
  .confirm-body {
    padding: 24px 24px 6px;
  }
  .confirm-body h2 {
    margin: 0;
    font-size: 18px;
    line-height: 1.35;
  }
  .confirm-body p {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 20px 24px 24px;
  }
</style>
