<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, Save, Trash2 } from '@lucide/svelte';
  import {
    Banner,
    Button,
    Card,
    CheckboxInput,
    Grid,
    Heading,
    HStack,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';

  type Group = { name: string; permissions: string[]; userIds: string[] };
  let {
    project,
    onrefresh
  }: { project: { id: string; slug: string }; onrefresh: () => Promise<void> } = $props();
  let members = $state<{ id: string; firstName: string; lastName: string }[]>([]);
  let groups = $state<Group[]>([]);
  let memberPermissions = $state<string[]>([]);
  let nonMemberPermissions = $state<string[]>([]);
  let loading = $state(true);
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');

  const articlePermissions = [
    'articles.content.propose',
    'articles.content.publish',
    'articles.content.edit-any',
    'docs.pages.review'
  ];
  const info = $derived<Record<string, [string, string]>>({
    'articles.content.propose': [
      'Twórz i proponuj artykuły',
      'Twórz artykuły w projekcie i proponuj zmiany w istniejących.'
    ],
    'articles.content.publish': [
      'Publikuj artykuły',
      'Oceniaj i publikuj artykuły projektu oraz proponowane zmiany.'
    ],
    'articles.content.edit-any': [
      'Edytuj artykuły utworzone przez dowolną osobę',
      'Edytuj dowolny artykuł w projekcie; do publikacji potrzebne jest dodatkowe uprawnienie.'
    ],
    'docs.pages.review': [
      'Oceniaj dokumentację',
      'Akceptuj lub odrzucaj propozycje zmian w dokumentacji i edytuj strony bezpośrednio. Upublicznienie strony nadal wymaga lidera projektu.'
    ],
    'projects.preview-credentials.read': [
      'Wyświetlanie danych logowania do podglądu',
      'Pokazuj wygenerowane hasła kont testowych dla podglądów tego projektu.'
    ]
  });
  const groupPermissions = $derived(
    project.slug === 'ksi-core'
      ? [...articlePermissions, 'projects.preview-credentials.read']
      : articlePermissions
  );

  async function load() {
    loading = true;
    error = '';
    try {
      const [membersResponse, permissionsResponse] = await Promise.all([
        fetch(`/api/platform/projects/${encodeURIComponent(project.id)}/members`),
        fetch(`/api/platform/projects/${encodeURIComponent(project.id)}/permissions`)
      ]);
      if (!membersResponse.ok || !permissionsResponse.ok)
        throw new Error('Nie udało się wczytać uprawnień projektu.');
      members = await membersResponse.json();
      const data = await permissionsResponse.json();
      groups = data.groups;
      memberPermissions = data.memberPermissions;
      nonMemberPermissions = data.nonMemberPermissions;
    } catch {
      error = 'Nie udało się wczytać uprawnień projektu.';
    } finally {
      loading = false;
    }
  }

  async function save() {
    busy = true;
    error = '';
    notice = '';
    try {
      const response = await fetch(
        `/api/platform/projects/${encodeURIComponent(project.id)}/permissions`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ groups, memberPermissions, nonMemberPermissions })
        }
      );
      if (!response.ok) throw new Error('Nie udało się zapisać uprawnień projektu.');
      notice = 'Zapisano ustawienia projektu.';
      await load();
      await onrefresh();
    } catch {
      error = 'Nie udało się zapisać uprawnień projektu.';
    } finally {
      busy = false;
    }
  }

  function toggle(values: string[], value: string) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  onMount(() => void load());
</script>

<HStack gap={4} vAlign="start" justify="between" wrap="wrap">
  <VStack gap={1}>
    <Heading level={1}>Uprawnienia projektu</Heading>
    <Text color="secondary">
      Wybierz domyślny dostęp do artykułów i dokumentacji oraz utwórz nazwane grupy z dodatkowymi
      uprawnieniami w projekcie.
    </Text>
  </VStack>
  <Button
    label="Zapisz uprawnienia"
    isDisabled={busy || loading || groups.some((group) => !group.name.trim())}
    isLoading={busy}
    onclick={() => void save()}
  >
    {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
  </Button>
</HStack>

{#if error}<Banner status="error" title={error} role="alert" />{/if}
{#if notice}<Banner status="success" title={notice} role="status" />{/if}

{#if loading}
  <HStack gap={2} vAlign="center">
    <Spinner size="sm" />
    <Text color="secondary">Wczytywanie uprawnień projektu…</Text>
  </HStack>
{:else}
  <VStack gap={6}>
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Domyślny dostęp w projekcie</Heading>
        <Text type="supporting" color="secondary">
          Te uprawnienia dotyczą wszystkich osób w wybranej kategorii i uzupełniają uprawnienia
          wynikające z roli konta. Aktywni członkowie KSI, którzy nie należą do tego projektu.
        </Text>
      </VStack>
      <Card padding={0}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell></TableHeaderCell>
              <TableHeaderCell>Członkowie projektu</TableHeaderCell>
              <TableHeaderCell>Osoby spoza projektu</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each articlePermissions as permission (permission)}
              <TableRow>
                <TableCell>
                  <VStack gap={0}>
                    <Text weight="medium">{info[permission]?.[0]}</Text>
                    <Text type="supporting" color="secondary">{info[permission]?.[1]}</Text>
                  </VStack>
                </TableCell>
                <TableCell>
                  <CheckboxInput
                    label={`Członkowie projektu: ${info[permission]?.[0]}`}
                    isLabelHidden
                    value={memberPermissions.includes(permission)}
                    onChange={() => (memberPermissions = toggle(memberPermissions, permission))}
                  />
                </TableCell>
                <TableCell>
                  <CheckboxInput
                    label={`Osoby spoza projektu: ${info[permission]?.[0]}`}
                    isLabelHidden
                    value={nonMemberPermissions.includes(permission)}
                    onChange={() =>
                      (nonMemberPermissions = toggle(nonMemberPermissions, permission))}
                  />
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </Card>
    </VStack>

    <VStack gap={4}>
      <HStack gap={3} vAlign="end" justify="between" wrap="wrap">
        <VStack gap={1}>
          <Heading level={2}>Nazwane grupy</Heading>
          <Text type="supporting" color="secondary">
            Do grupy można przypisać tylko aktywnych członków projektu.
          </Text>
        </VStack>
        <Button
          variant="secondary"
          label="Dodaj grupę"
          isDisabled={busy || groups.length >= 30}
          onclick={() => (groups = [...groups, { name: '', permissions: [], userIds: [] }])}
        >
          {#snippet icon()}<Plus size={15} aria-hidden="true" />{/snippet}
        </Button>
      </HStack>

      {#each groups as group, index (index)}
        <Card>
          <VStack gap={4}>
            <HStack gap={3} vAlign="end" justify="between" wrap="wrap">
              <VStack gap={0} class="group-name">
                <TextInput
                  id={`group-name-${index}`}
                  label="Nazwa grupy"
                  value={group.name}
                  onChange={(value) => (group.name = value.slice(0, 60))}
                  placeholder="Na przykład: Opiekunowie"
                  isRequired
                />
              </VStack>
              <Button
                variant="destructive"
                label="Usuń grupę"
                isDisabled={busy}
                onclick={() => (groups = groups.filter((_, i) => i !== index))}
              >
                {#snippet icon()}<Trash2 size={15} aria-hidden="true" />{/snippet}
              </Button>
            </HStack>
            <Grid columns={{ minWidth: 260, max: 2 }} gap={4}>
              <fieldset>
                <legend>Członkowie</legend>
                <VStack gap={2}>
                  {#each members as member (member.id)}
                    <CheckboxInput
                      label={`${member.firstName} ${member.lastName}`}
                      value={group.userIds.includes(member.id)}
                      onChange={() => (group.userIds = toggle(group.userIds, member.id))}
                    />
                  {/each}
                </VStack>
              </fieldset>
              <fieldset>
                <legend>Uprawnienia</legend>
                <VStack gap={2}>
                  {#each groupPermissions as permission (permission)}
                    <CheckboxInput
                      label={info[permission]?.[0] ?? permission}
                      description={info[permission]?.[1]}
                      value={group.permissions.includes(permission)}
                      onChange={() => (group.permissions = toggle(group.permissions, permission))}
                    />
                  {/each}
                </VStack>
              </fieldset>
            </Grid>
          </VStack>
        </Card>
      {:else}
        <Text type="supporting" color="secondary">Brak grup.</Text>
      {/each}
    </VStack>
  </VStack>
{/if}

<style>
  :global(.group-name) {
    flex: 1 1 260px;
    max-width: 420px;
  }
  fieldset {
    display: grid;
    gap: var(--spacing-2);
    margin: 0;
    padding: var(--spacing-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-element);
  }
  legend {
    padding-inline: var(--spacing-1);
    color: var(--color-text-secondary);
    font-size: var(--text-supporting-size);
    font-weight: var(--font-weight-medium);
  }
</style>
