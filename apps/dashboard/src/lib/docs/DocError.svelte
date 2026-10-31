<script lang="ts">
  let { code }: { code: string } = $props();
</script>

{#if code}<p class="error" role="alert">
    {#if code === 'REVISION_CONFLICT'}
      Strona zmieniła się podczas edycji. Skopiuj swój tekst, odśwież stronę i wprowadź zmiany
      ponownie.
    {:else if code === 'DOC_SLUG_TAKEN'}
      W tej przestrzeni istnieje już strona o tym adresie.
    {:else if code === 'DOC_SLUG_RESERVED'}
      Ten adres jest zarezerwowany. Wybierz inny.
    {:else if code === 'DOC_NOT_FOUND' || code === '404'}
      Ta strona nie istnieje lub została przeniesiona.
    {:else if code === 'PROPOSAL_NOT_FOUND'}
      Ta propozycja nie istnieje.
    {:else if code === 'PROPOSAL_ALREADY_RESOLVED'}
      Ktoś już ocenił tę propozycję.
    {:else if code === 'PUBLISH_FORBIDDEN'}
      Tylko liderzy przestrzeni mogą zmieniać widoczność publiczną strony.
    {:else if code === 'NO_CHANGES'}
      Nic się jeszcze nie zmieniło. Edytuj stronę przed zapisaniem.
    {:else if code === 'REASON_REQUIRED'}
      Opisz, dlaczego proponujesz tę zmianę.
    {:else if code === 'PRIMARY_SOURCE_REQUIRED'}
      Najpierw dodaj tekst po polsku, a następnie jego tłumaczenia.
    {:else if code === 'FOLDER_NOT_FOUND'}
      Ten folder nie jest dostępny w tej przestrzeni. Odśwież stronę i wybierz inny folder.
    {:else if code === 'FOLDER_NOT_EMPTY'}
      Przed usunięciem folderu przenieś z niego strony i podfoldery.
    {:else if code === 'FOLDER_IN_USE'}
      Ten folder jest używany w oczekującej propozycji. Przed jego usunięciem rozpatrz lub wycofaj
      tę propozycję.
    {:else if code === 'FOLDER_NAME_TAKEN'}
      Folder o tej polskiej nazwie już istnieje w wybranym folderze nadrzędnym.
    {:else if code === 'FOLDER_NAME_INVALID'}
      Wpisz nazwę folderu bez znaku „/”. Folder nadrzędny wybierz osobno.
    {:else if code === 'FOLDER_CYCLE'}
      Nie można umieścić folderu w nim samym ani w jednym z jego podfolderów.
    {:else if code === 'FORBIDDEN'}
      Nie masz uprawnień do tej operacji.
    {:else}
      Coś poszło nie tak. Spróbuj ponownie.
    {/if}
  </p>{/if}
