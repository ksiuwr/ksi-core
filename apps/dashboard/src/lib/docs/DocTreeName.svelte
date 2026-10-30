<script lang="ts">
  import TreeLabel from '@ksi-core/ui/platform/TreeLabel.svelte';
  let { value, tooltip }: { value: string; tooltip?: string } = $props();
</script>

<TreeLabel {value} {tooltip} />
