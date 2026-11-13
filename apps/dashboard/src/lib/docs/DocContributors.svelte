<script lang="ts">
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import {
    Card,
    EmptyState,
    Grid,
    Heading,
    HStack,
    Icon,
    ProgressBar,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Text,
    Tooltip,
    VStack
  } from '@astryx-sv/core';
  import { Check, Clock, UsersRound, X } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { preferences } from '$lib/preferences.svelte';
  import type { DocInsights } from './docs';

  let { insights, workspaceName }: { insights: DocInsights; workspaceName: string } = $props();

  const language = $derived(preferences.language);
  const most = $derived(Math.max(1, ...insights.contributors.map((row) => row.revisions)));
  const when = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'short', year: 'numeric' });
  const totals = $derived([
    { label: 'Strony', value: insights.pages },
    { label: 'Zmiany', value: insights.revisions },
    { label: 'Autorzy', value: insights.contributors.length }
  ]);
</script>

<HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
  <VStack gap={1}>
    <Text type="supporting" class="workspace-eyebrow">{workspaceName}</Text>
    <Heading level={1}>Autorzy</Heading>
    <Text as="p" class="workspace-description">
      Kto dba o tę dokumentację. Zmiany obejmują zaakceptowane edycje, również z propozycji.
    </Text>
  </VStack>
</HStack>

<Grid columns={{ minWidth: 140, max: 3 }} gap={3} class="contributors-totals">
  {#each totals as total (total.label)}
    <Card padding={4}>
      <VStack gap={1}>
        <Text type="supporting" color="secondary">{total.label}</Text>
        <Text size="2xl" weight="semibold">{total.value}</Text>
      </VStack>
    </Card>
  {/each}
</Grid>

{#if insights.contributors.length}
  <Table density="compact" dividers="rows" aria-label="Autorzy dokumentacji">
    <TableHeader>
      <TableRow isHeaderRow>
        <TableHeaderCell scope="col">Członek</TableHeaderCell>
        <TableHeaderCell scope="col">Zmiany</TableHeaderCell>
        <TableHeaderCell scope="col">Strony</TableHeaderCell>
        <TableHeaderCell scope="col">Wiersze</TableHeaderCell>
        <TableHeaderCell scope="col">Propozycje zmian</TableHeaderCell>
        <TableHeaderCell scope="col">Ostatnia zmiana</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each insights.contributors as row (row.user.id)}
        <TableRow>
          <TableCell>
            <MemberPreview
              member={row.user}
              href={`/people/${encodeURIComponent(row.user.id)}`}
              size={28}
            />
          </TableCell>
          <TableCell>
            <HStack gap={2} vAlign="center">
              <HStack width={80}>
                <ProgressBar
                  label={`Zmiany: ${row.revisions}`}
                  value={(row.revisions / most) * 100}
                  isLabelHidden
                />
              </HStack>
              <Text weight="semibold">{row.revisions}</Text>
            </HStack>
          </TableCell>
          <TableCell>{row.pages}</TableCell>
          <TableCell>
            <HStack gap={2} class="contributors-lines">
              <Text type="supporting" class={`added ${row.additions ? '' : 'none'}`}
                >+{row.additions}</Text
              >
              <Text type="supporting" class={`removed ${row.deletions ? '' : 'none'}`}
                >−{row.deletions}</Text
              >
            </HStack>
          </TableCell>
          <TableCell>
            <!-- Flex lives inside the cell; a flex cell drops out of the table's row layout. -->
            <HStack gap={1.5} class="contributors-suggestions">
              <Tooltip content={'Zaakceptowana'}>
                <HStack gap={0.5} vAlign="center" class={row.accepted ? undefined : 'none'}>
                  <Icon icon={Check} size="xsm" />
                  <Text type="supporting">{row.accepted}</Text>
                </HStack>
              </Tooltip>
              <Tooltip content={'Czeka na ocenę'}>
                <HStack gap={0.5} vAlign="center" class={row.pending ? undefined : 'none'}>
                  <Icon icon={Clock} size="xsm" />
                  <Text type="supporting">{row.pending}</Text>
                </HStack>
              </Tooltip>
              <Tooltip content={'Odrzucona'}>
                <HStack gap={0.5} vAlign="center" class={row.rejected ? undefined : 'none'}>
                  <Icon icon={X} size="xsm" />
                  <Text type="supporting">{row.rejected}</Text>
                </HStack>
              </Tooltip>
            </HStack>
          </TableCell>
          <TableCell>
            <Text type="supporting">
              <time datetime={row.lastContributionAt}>{when(row.lastContributionAt)}</time>
            </Text>
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
{:else}
  <EmptyState title="Brak wkładu" headingLevel={2}>
    {#snippet icon()}<Icon icon={UsersRound} size="lg" color="secondary" />{/snippet}
  </EmptyState>
{/if}

<style>
  :global(.contributors-totals) {
    margin-bottom: var(--spacing-6);
  }
  :global(.contributors-lines),
  :global(.contributors-suggestions) {
    font-family: var(--font-family-code);
  }
  /* Zeroes are most of this table; the numbers that matter should stand out from them. */
  :global(.contributors-suggestions .none),
  :global(.contributors-lines .none) {
    opacity: 0.5;
  }
  :global(.contributors-lines .added) {
    color: var(--color-text-green);
    font-family: var(--font-family-code);
  }
  :global(.contributors-lines .removed) {
    color: var(--color-text-red);
    font-family: var(--font-family-code);
  }
</style>
