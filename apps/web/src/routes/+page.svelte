<script lang="ts">
  import { Lightbulb, Microscope, Presentation } from '@lucide/svelte';
  import { Badge, Button, Card, Grid, Heading, HStack, Icon, Text, VStack } from '@astryx-sv/core';
  import ProjectCard from '../components/ui/ProjectCard.svelte';
  import ContactBanner from '../components/ui/ContactBanner.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();

  const research = [
    {
      icon: Microscope,
      title: 'Dyskusje o pracach naukowych',
      description: 'Spotykamy się, żeby czytać i omawiać prace naukowe.'
    },
    {
      icon: Presentation,
      title: 'Seminaria gościnne',
      description: 'Badacze i absolwenci opowiadają o swojej pracy.'
    },
    {
      icon: Lightbulb,
      title: 'Projekty badawcze',
      description: 'Pracujemy nad problemami badawczymi z pracownikami naukowymi.'
    }
  ];
</script>

<main class="flex-1">
  <VStack gap={0}>
    <VStack class="hero border-line relative isolate overflow-hidden border-b" paddingBlock={8}>
      <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="center" class="page-container">
        <VStack gap={5}>
          <HStack>
            <Badge variant="neutral" label="Koło naukowe na Uniwersytecie Wrocławskim" />
          </HStack>
          <Heading level={1} type="display-1">Jesteśmy KSI.</Heading>
          <Text type="large" color="secondary">
            Jesteśmy studentami informatyki na Uniwersytecie Wrocławskim. Tworzymy oprogramowanie,
            prowadzimy warsztaty i organizujemy wydarzenia.
          </Text>
          <HStack gap={2} wrap="wrap">
            <Button href="#projects" variant="primary" size="lg" label="Zobacz, co robimy" />
            <Button href="#about" variant="secondary" size="lg" label="O KSI" />
          </HStack>
        </VStack>
        <VStack class="hero-photo relative mx-auto w-full max-w-xl lg:mr-0">
          <img
            src="/members/0.webp"
            class="border-line relative aspect-[4/3] w-full rounded-2xl border object-cover"
            alt="Członkowie KSI"
          />
        </VStack>
      </Grid>
    </VStack>

    <VStack gap={10} class="page-container">
      <Card elevation="low" padding={0} class="relative -mt-8">
        <Grid columns={{ minWidth: 220, max: 3 }} gap={0}>
          <VStack gap={1} padding={5}>
            <Text type="display-2" weight="semibold">500+</Text>
            <Text type="supporting" color="secondary">Dzieci uczące się programowania</Text>
          </VStack>
          <VStack gap={1} padding={5}>
            <Text type="display-2" weight="semibold">25+</Text>
            <Text type="supporting" color="secondary">Zorganizowane konferencje</Text>
          </VStack>
          <VStack gap={1} padding={5}>
            <Text type="display-2" weight="semibold">20+</Text>
            <Text type="supporting" color="secondary">Zorganizowane wykłady stacjonarne</Text>
          </VStack>
        </Grid>
      </Card>

      <VStack gap={6} as="section" id="about">
        <Heading level={2} id="about-heading">Wydarzenia i warsztaty</Heading>
        <Grid columns={{ minWidth: 300, max: 2 }} gap={5}>
          <Card padding={0} elevation="low">
            <VStack gap={0}>
              <img
                src="https://pub-4e8af66414434008bafa6614f6af4b22.r2.dev/zosia-2026/01.webp"
                alt="ZOSIA"
                class="border-line aspect-[16/9] w-full border-b object-cover"
              />
              <VStack gap={2} padding={5}>
                <Heading level={3}>ZOSIA</Heading>
                <Text color="secondary" type="supporting">
                  Nasz zimowy obóz w górach na Dolnym Śląsku. Są wykłady o badaniach i
                  zainteresowaniach oraz czas, żeby pobyć razem.
                </Text>
                <Button href="/projects/zosia" variant="ghost" label="Czytaj dalej" />
              </VStack>
            </VStack>
          </Card>
          <Card padding={0} elevation="low">
            <VStack gap={0}>
              <img
                src="https://pub-4e8af66414434008bafa6614f6af4b22.r2.dev/project-hoc-past/8.webp"
                alt="Hour of Code"
                class="border-line aspect-[16/9] w-full border-b object-cover"
              />
              <VStack gap={2} padding={5}>
                <Heading level={3}>Hour of Code</Heading>
                <Text color="secondary" type="supporting">
                  Uczymy dzieci programowania na godzinnych warsztatach.
                </Text>
                <Button href="/projects/hoc" variant="ghost" label="Czytaj dalej" />
              </VStack>
            </VStack>
          </Card>
        </Grid>
      </VStack>

      <VStack gap={6} as="section" id="projects">
        <HStack justify="between" vAlign="end" gap={4} wrap="wrap">
          <Heading level={2} id="projects-heading">Nasze projekty</Heading>
          <Button href="/projects" variant="secondary" size="sm" label="Zobacz więcej projektów" />
        </HStack>
        {#if data.projects.length}
          <Grid columns={{ minWidth: 240, max: 4 }} gap={5}>
            {#each data.projects as project}
              <ProjectCard {project} />
            {/each}
          </Grid>
        {:else}
          <Card variant="muted" padding={8}>
            <Text color="secondary" justify="center">Więcej projektów wkrótce.</Text>
          </Card>
        {/if}
      </VStack>

      <VStack gap={6} as="section" id="scientific">
        <Heading level={2} id="research-heading">Badania w KSI</Heading>
        <Grid columns={{ minWidth: 260, max: 3 }} gap={5}>
          {#each research as item}
            <Card padding={5}>
              <VStack gap={4}>
                <Icon icon={item.icon} color="accent" size="lg" />
                <VStack gap={1}>
                  <Heading level={3}>{item.title}</Heading>
                  <Text type="supporting" color="secondary">{item.description}</Text>
                </VStack>
              </VStack>
            </Card>
          {/each}
        </Grid>
      </VStack>

      <VStack paddingBlock={8}>
        <ContactBanner />
      </VStack>
    </VStack>
  </VStack>
</main>

<style>
  /* A dotted canvas that fades out towards the edges. */
  :global(.hero)::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image: radial-gradient(
      color-mix(in oklch, var(--ink) 16%, transparent) 1px,
      transparent 1px
    );
    background-size: 22px 22px;
    mask-image: radial-gradient(ellipse 70% 80% at 70% 40%, #000 30%, transparent 75%);
  }
</style>
