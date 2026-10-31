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
  <legend>Przedział wyświetlania</legend>
  <div class="interval-fields">
    <DateTimePicker
      bind:value={start}
      label="Od (czas lokalny)"
      placeholder="Wybierz datę i godzinę rozpoczęcia"
      defaultTime="00:00"
      {disabled}
    />
    <DateTimePicker
      bind:value={end}
      label="Do (czas lokalny)"
      placeholder="Wybierz datę i godzinę zakończenia"
      {disabled}
    />
  </div>
  {#if invalid}<p class="interval-error" role="alert">Koniec musi przypadać po początku.</p>{/if}
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
