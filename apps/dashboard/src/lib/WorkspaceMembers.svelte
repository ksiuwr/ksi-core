<script lang="ts">
  import { Github, Linkedin, ArrowLeft } from '@lucide/svelte';
  import Skeleton from './Skeleton.svelte';
  import MemberPreview from './MemberPreview.svelte';
  import {
    Avatar,
    Banner,
    Button,
    Card,
    EmptyState,
    Heading,
    HStack,
    Link,
    List,
    ListItem,
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
  let {
    projectId,
    memberId,
    websiteOrigin,
    elevated = false,
    canManage = false
  }: {
    canManage?: boolean;
    projectId?: string;
    memberId?: string;
    websiteOrigin: string;
    elevated?: boolean;
  } = $props();
  type Member = {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string | null;
    image: string | null;
    bio: string | null;
    role: string;
    leader?: boolean;
    github?: string | null;
    linkedin?: string | null;
  };
  let members = $state<Member[]>([]),
    person = $state<Member | null>(null),
    loading = $state(true),
    error = $state(''),
    search = $state('');
  let reloadKey = $state(0),
    busy = $state(false),
    removing = $state<string | null>(null),
    requests = $state<
      { request: { id: string; userId: string }; firstName: string; lastName: string }[]
    >([]);
  let generation = 0;
  const manageable = $derived(canManage && !!projectId && !memberId);
  const leaderIds = $derived(members.filter((m) => m.leader).map((m) => m.id));

  async function manage(work: () => Promise<Response>) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      const response = await work();
      if (!response.ok) throw new Error('Nie udało się zaktualizować członków.');
      removing = null;
      reloadKey++;
    } catch (cause) {
      error = (cause as Error).message;
    } finally {
      busy = false;
    }
  }
  const projectApi = (path: string, method: string, body?: unknown) =>
    fetch(`/api/platform/projects/${encodeURIComponent(projectId!)}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  function setLeader(id: string, leader: boolean) {
    const userIds = leader ? [...leaderIds, id] : leaderIds.filter((value) => value !== id);
    void manage(() => projectApi('/leaders', 'PUT', { userIds }));
  }

  $effect(() => {
    void reloadKey;
    if (!manageable) return;
    void projectApi('/join-requests', 'GET')
      .then((response) => (response.ok ? response.json() : []))
      .then((result) => (requests = result))
      .catch(() => (requests = []));
  });
  const filtered = $derived(
    members.filter((m) =>
      `${m.firstName} ${m.lastName} ${m.nickname ?? ''}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    )
  );
  function role(m: Member) {
    return m.leader
      ? 'Lider projektu'
      : m.role === 'administrator'
        ? 'Administrator'
        : m.role === 'board'
          ? 'Członek zarządu'
          : 'Członek';
  }
  $effect(() => {
    const path = memberId
      ? `/members/${encodeURIComponent(memberId)}`
      : projectId
        ? `/projects/${encodeURIComponent(projectId)}/members`
        : '/members';
    void reloadKey;
    const current = ++generation;
    loading = reloadKey === 0;
    error = '';
    void fetch(`/api/platform${path}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Nie udało się wczytać członków.');
        const result = await response.json();
        if (current !== generation) return;
        if (memberId) person = result;
        else members = result;
      })
      .catch((e) => {
        if (current === generation) error = e.message;
      })
      .finally(() => {
        if (current === generation) loading = false;
      });
  });
</script>

{#if loading}
  <Skeleton label="Ładowanie członków" />
{:else if error}
  <Banner status="error" title={error} role="alert" />
{:else if person}
  <HStack>
    <Button variant="secondary" label="Członkowie" href="/association/members">
      {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
    </Button>
  </HStack>
  <Card>
    <HStack gap={5} vAlign="start" wrap="wrap">
      {#if person.image}
        <Avatar
          src={person.image}
          name={`${person.firstName} ${person.lastName}`}
          size={96}
          shape="rounded"
        />
      {/if}
      <VStack gap={2}>
        <Heading level={1}>{person.firstName} {person.lastName}</Heading>
        <Button
          variant="secondary"
          label="Zobacz publiczny profil"
          href={`${websiteOrigin}/members/${encodeURIComponent(person.id)}`}
          target="_blank"
          rel="noopener noreferrer"
        />
        {#if person.nickname}<Text type="supporting" color="secondary">aka. {person.nickname}</Text
          >{/if}
        <Text type="supporting" color="secondary">{role(person)}</Text>
        <Text>{person.bio}</Text>
        <HStack gap={2} wrap="wrap">
          {#if person.github}
            <Button
              variant="secondary"
              label="GitHub"
              href={person.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              {#snippet icon()}<Github size={16} aria-hidden="true" />{/snippet}
            </Button>
          {/if}
          {#if person.linkedin}
            <Button
              variant="secondary"
              label="LinkedIn"
              href={person.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              {#snippet icon()}<Linkedin size={16} aria-hidden="true" />{/snippet}
            </Button>
          {/if}
          {#if elevated}
            <Button
              variant="secondary"
              label="Zarządzaj kontem"
              href={`/members/${encodeURIComponent(person.id)}`}
            />
          {/if}
        </HStack>
      </VStack>
    </HStack>
  </Card>
{:else}
  <HStack gap={4} vAlign="center" justify="between" wrap="wrap">
    <Heading level={1}>Członkowie</Heading>
    <VStack gap={0} class="member-search">
      <TextInput
        label="Szukaj członków"
        isLabelHidden
        bind:value={search}
        placeholder="Imię, nazwisko lub pseudonim…"
      />
    </VStack>
  </HStack>
  {#if error}<Banner status="error" title={error} role="alert" />{/if}
  {#if manageable && requests.length}
    <Card>
      <VStack gap={3}>
        <Heading level={2}>Prośby o dołączenie</Heading>
        <List hasDividers>
          {#each requests as request (request.request.id)}
            <ListItem>
              {#snippet label()}
                <Link href={`/people/${encodeURIComponent(request.request.userId)}`}>
                  {request.firstName}
                  {request.lastName}
                </Link>
              {/snippet}
              {#snippet endContent()}
                <HStack gap={2}>
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Akceptuj"
                    isDisabled={busy}
                    onclick={() =>
                      manage(() =>
                        projectApi(`/join-requests/${request.request.id}`, 'POST', { accept: true })
                      )}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Odrzuć"
                    isDisabled={busy}
                    onclick={() =>
                      manage(() =>
                        projectApi(`/join-requests/${request.request.id}`, 'POST', {
                          accept: false
                        })
                      )}
                  />
                </HStack>
              {/snippet}
            </ListItem>
          {/each}
        </List>
      </VStack>
    </Card>
  {/if}
  <Card padding={0}>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Osoba</TableHeaderCell>
          <TableHeaderCell>Rola</TableHeaderCell>
          <TableHeaderCell>O osobie</TableHeaderCell>
          {#if manageable}<TableHeaderCell></TableHeaderCell>{/if}
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each filtered as member (member.id)}
          <TableRow>
            <TableCell>
              <MemberPreview
                {member}
                href={`/people/${encodeURIComponent(member.id)}`}
                role={role(member)}
              />
            </TableCell>
            <TableCell>{role(member)}</TableCell>
            <TableCell><Text type="supporting" color="secondary">{member.bio}</Text></TableCell>
            {#if manageable}
              <TableCell>
                <HStack gap={1} justify="end" wrap="wrap">
                  {#if removing === member.id}
                    <Button
                      variant="destructive"
                      size="sm"
                      label="Tak, usuń"
                      isDisabled={busy}
                      onclick={() => manage(() => projectApi(`/members/${member.id}`, 'DELETE'))}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      label="Anuluj"
                      onclick={() => (removing = null)}
                    />
                  {:else}
                    <Button
                      variant="secondary"
                      size="sm"
                      label={member.leader ? 'Odbierz rolę lidera' : 'Mianuj liderem'}
                      isDisabled={busy || (member.leader && leaderIds.length <= 1)}
                      onclick={() => setLeader(member.id, !member.leader)}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      label="Usuń z projektu"
                      isDisabled={busy}
                      onclick={() => (removing = member.id)}
                    />
                  {/if}
                </HStack>
              </TableCell>
            {/if}
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    {#if !filtered.length}
      <EmptyState title="Brak pasujących osób" description="Zmień wyszukiwaną frazę." />
    {/if}
  </Card>
{/if}

<style>
  :global(.member-search) {
    width: min(320px, 100%);
  }
</style>
