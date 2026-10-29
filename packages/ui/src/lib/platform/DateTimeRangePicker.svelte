<script lang="ts">
  import DateTimePicker from './DateTimePicker.svelte';

  let {
    start = $bindable(''),
    end = $bindable(''),
    disabled = false
  }: {
    start?: string;
    end?: string;
    disabled?: boolean;
  } = $props();

  const invalid = $derived(!!start && !!end && new Date(end) <= new Date(start));
</script>

<fieldset class="interval" {disabled}>
  <legend>Display interval</legend>
  <div class="interval-fields">
    <DateTimePicker
      bind:value={start}
      label="From (local time)"
      placeholder="Choose start date and time"
      defaultTime="00:00"
      {disabled}
    />
    <DateTimePicker
      bind:value={end}
      label="To (local time)"
      placeholder="Choose end date and time"
      {disabled}
    />
  </div>
  {#if invalid}<p class="interval-error" role="alert">The end must be after the start.</p>{/if}
</fieldset>

<style>
  .interval {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend {
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 600;
  }
  .interval-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .interval-error {
    margin: 8px 0 0;
    color: var(--danger);
    font-size: 13px;
  }
  @media (max-width: 600px) {
    .interval-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
