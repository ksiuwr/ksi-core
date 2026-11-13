<script lang="ts">
  import { AlertDialog } from '@astryx-sv/core';

  let {
    open,
    title,
    message = '',
    confirmLabel = 'Usuń',
    cancelLabel = 'Anuluj',
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
</script>

<AlertDialog
  isOpen={open}
  onOpenChange={(isOpen) => {
    if (!isOpen && !busy) onclose();
  }}
  {title}
  description={message || title}
  actionLabel={confirmLabel}
  {cancelLabel}
  actionVariant="destructive"
  isActionLoading={busy}
  onAction={onconfirm}
/>
