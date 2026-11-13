<script lang="ts">
  import { Facebook, Github, Instagram, Linkedin } from '@lucide/svelte';
  import { Button, Divider, Grid, HStack, Link, Text, VStack } from '@astryx-sv/core';

  const commitHash = import.meta.env.PUBLIC_COMMIT_HASH || '';
  const shortCommitHash = commitHash.slice(0, 7);

  // @wc-ignore
  const socialLinks = [
    { label: 'GitHub', href: 'https://github.com/ksiuwr', icon: Github },
    { label: 'Instagram', href: 'https://instagram.com/ksi_uwr', icon: Instagram },
    { label: 'Facebook', href: 'https://www.facebook.com/ksi.uwr', icon: Facebook },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/ksiuwr/', icon: Linkedin }
  ];

  // @wc-ignore
  const featuredProjects = [
    { label: 'ZOSIA', href: '/projects/zosia' },
    { label: 'LEOSIA', href: '/projects/leosia' },
    { label: 'ksi-core', href: '/projects/ksi-core' }
  ];
</script>

<footer class="border-line bg-surface text-ink border-t">
  <VStack gap={8} padding={8} class="page-container">
    <Grid columns={{ minWidth: 200, max: 4 }} gap={8}>
      <VStack gap={3}>
        <Link href="/" color="primary" type="label" weight="bold">
          <HStack gap={2} vAlign="center">
            <img src="/logo.svg" alt="" class="size-9 dark:invert" />
            <Text as="span" type="large" weight="semibold">KSI UWr</Text>
          </HStack>
        </Link>
        <Text color="secondary" type="supporting">
          Koło Studentów Informatyki Uniwersytetu Wrocławskiego.
        </Text>
        <Text color="secondary" type="supporting">
          Instytut Informatyki<br />
          ul. Fryderyka Joliot-Curie 15<br />
          50-383 Wrocław · pokój 24
        </Text>
      </VStack>

      <VStack gap={3} as="nav">
        <Text type="label" color="secondary">Nasze projekty</Text>
        <VStack gap={2}>
          {#each featuredProjects as project (project.href)}
            <Link href={project.href} color="secondary" type="supporting">{project.label}</Link>
          {/each}
          <Link href="/projects" color="secondary" type="supporting">Wszystkie projekty</Link>
        </VStack>
      </VStack>

      <VStack gap={3} as="nav">
        <Text type="label" color="secondary">Odkrywaj</Text>
        <VStack gap={2}>
          <Link href="/articles" color="secondary" type="supporting">Artykuły</Link>
          <Link href="/docs" color="secondary" type="supporting">Dokumentacja</Link>
          <Link href="mailto:ksi@cs.uni.wroc.pl" color="secondary" type="supporting">Kontakt</Link>
        </VStack>
      </VStack>

      <VStack gap={3}>
        <Text type="label" color="secondary">Obserwuj nas</Text>
        <VStack gap={2}>
          {#each socialLinks as social (social.href)}
            <Button
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="sm"
              width="fit-content"
              label={social.label}
            >
              {#snippet icon()}<social.icon class="size-4" aria-hidden="true" />{/snippet}
            </Button>
          {/each}
        </VStack>
      </VStack>
    </Grid>

    <Divider />

    <HStack justify="between" vAlign="center" gap={3} wrap="wrap">
      <HStack gap={2} vAlign="center">
        <Text type="supporting" color="secondary">© KSI {new Date().getFullYear()}</Text>
        <Text type="code" color="secondary">v{import.meta.env.PUBLIC_APP_VERSION}</Text>
      </HStack>
      <HStack gap={4} vAlign="center">
        <Link
          href="https://github.com/ksiuwr/ksi-core"
          color="secondary"
          type="supporting"
          isExternalLink
        >
          Kod źródłowy
        </Link>
        {#if commitHash}
          <Link
            href="https://github.com/ksiuwr/ksi-core/commit/{commitHash}"
            color="secondary"
            type="supporting"
            isExternalLink
            tooltip="Rewizja {commitHash}"
          >
            {shortCommitHash}
          </Link>
        {/if}
      </HStack>
    </HStack>
  </VStack>
</footer>
