<script lang="ts">
  import { Banner } from '@astryx-sv/core';

  let { code }: { code: string } = $props();

  const messages: Record<string, string> = {
    REVISION_CONFLICT:
      'Strona zmieniła się podczas edycji. Skopiuj swój tekst, odśwież stronę i wprowadź zmiany ponownie.',
    DOC_SLUG_TAKEN: 'W tej przestrzeni istnieje już strona o tym adresie.',
    DOC_SLUG_RESERVED: 'Ten adres jest zarezerwowany. Wybierz inny.',
    DOC_NOT_FOUND: 'Ta strona nie istnieje lub została przeniesiona.',
    '404': 'Ta strona nie istnieje lub została przeniesiona.',
    PROPOSAL_NOT_FOUND: 'Ta propozycja nie istnieje.',
    PROPOSAL_ALREADY_RESOLVED: 'Ktoś już ocenił tę propozycję.',
    PUBLISH_FORBIDDEN: 'Tylko liderzy przestrzeni mogą zmieniać widoczność publiczną strony.',
    NO_CHANGES: 'Nic się jeszcze nie zmieniło. Edytuj stronę przed zapisaniem.',
    REASON_REQUIRED: 'Opisz, dlaczego proponujesz tę zmianę.',
    PRIMARY_SOURCE_REQUIRED: 'Najpierw dodaj tekst po polsku, a następnie jego tłumaczenia.',
    FOLDER_NOT_FOUND:
      'Ten folder nie jest dostępny w tej przestrzeni. Odśwież stronę i wybierz inny folder.',
    FOLDER_NOT_EMPTY: 'Przed usunięciem folderu przenieś z niego strony i podfoldery.',
    FOLDER_IN_USE:
      'Ten folder jest używany w oczekującej propozycji. Przed jego usunięciem rozpatrz lub wycofaj tę propozycję.',
    FOLDER_NAME_TAKEN: 'Folder o tej polskiej nazwie już istnieje w wybranym folderze nadrzędnym.',
    FOLDER_NAME_INVALID: 'Wpisz nazwę folderu bez znaku „/”. Folder nadrzędny wybierz osobno.',
    FOLDER_CYCLE: 'Nie można umieścić folderu w nim samym ani w jednym z jego podfolderów.',
    FORBIDDEN: 'Nie masz uprawnień do tej operacji.'
  };
  const message = $derived(messages[code] ?? 'Coś poszło nie tak. Spróbuj ponownie.');
</script>

{#if code}
  <Banner status="error" title={message} container="section" role="alert" class="doc-error" />
{/if}

<style>
  :global(.doc-error) {
    margin-bottom: var(--spacing-4);
  }
</style>
