// Single registry shared by authorization and permission-picker hints.
export const permissions = {
  'users.profile.edit-first-name': 'Edit your first name.',
  'users.profile.edit-last-name': 'Edit your last name.',
  'users.profile.edit-avatar': 'Submit or withdraw your avatar for administrator approval.',
  'users.approvals.review-avatar': 'Review and accept or decline avatar requests.',
  'users.profile.edit-bio': 'Edit your biography.',
  'users.profile.edit-social-links': 'Edit your GitHub and LinkedIn profile links.',
  'users.profile.edit-privacy': 'Choose how your name appears on public pages.',
  'users.profile.edit-nickname': 'Edit your nickname.',
  'users.membership.activate': 'Activate pending ordinary members.',
  'users.membership.suspend': 'Suspend member accounts.',
  'users.roles.assign': 'Assign member, board and administrator roles.',
  'users.permissions.assign': 'Assign explicit permission grants and denials.',
  'users.accounts.edit-email':
    'Change another member’s email and require verification as an administrator.',
  'users.accounts.reset-password':
    'Send a password recovery link to another member as an administrator.',
  'users.accounts.anonymize': 'Anonymize accounts while preserving association content.',
  'users.members.manage-profile': 'Edit another member’s profile as an administrator.',
  'projects.catalog.create': 'Create projects and assign their initial leaders.',
  'projects.catalog.edit': 'Edit project details and collaboration board settings as a leader.',
  'projects.membership.join': 'Join open projects or request access to locked projects.',
  'projects.membership.manage': 'Manage project leaders, memberships and join requests.',
  'projects.layout.edit': 'Reorder or hide sections and edit project links.',
  'projects.preview-credentials.read': 'View generated sign-in credentials for project previews.',
  'articles.content.propose': 'Create drafts and propose article changes in your workspace.',
  'articles.content.publish': 'Review proposals and publish articles as a workspace leader.',
  'articles.content.edit-any':
    'Edit any article in the project, including articles created by others.',
  'articles.authors.manage-credit':
    'Choose whether your contribution receives public author credit.',
  'collaboration.items.contribute':
    'Create and edit tasks, threads and comments in joined workspaces.',
  'collaboration.items.restore':
    'Restore removed tasks and archive or restore threads as a leader.',
  'collaboration.threads.restrict':
    'Manage restricted thread visibility and invitations as a leader.',
  'audit.events.read': 'Read audit events permitted by your workspace scope.',
  'files.objects.upload': 'Upload files to authorized content.',
  'association.alerts.manage': 'Manage association announcements and alerts.'
} as const;
export type Permission = keyof typeof permissions;
export const permissionKeys = Object.keys(permissions) as Permission[];

export const polishPermissionDescriptions: Record<Permission, string> = {
  'users.profile.edit-first-name': 'Edytuj swoje imię.',
  'users.profile.edit-last-name': 'Edytuj swoje nazwisko.',
  'users.profile.edit-avatar': 'Zgłoś lub wycofaj awatar do akceptacji przez administratora.',
  'users.approvals.review-avatar': 'Akceptuj lub odrzucaj prośby o zmianę awatara.',
  'users.profile.edit-bio': 'Edytuj swój opis.',
  'users.profile.edit-social-links': 'Edytuj linki do swoich profili GitHub i LinkedIn.',
  'users.profile.edit-privacy':
    'Wybierz sposób wyświetlania swojego imienia i nazwiska na stronach publicznych.',
  'users.profile.edit-nickname': 'Edytuj swój pseudonim.',
  'users.membership.activate': 'Aktywuj oczekujące konta zwykłych członków.',
  'users.membership.suspend': 'Zawieszaj konta członków.',
  'users.roles.assign': 'Przypisuj role członka, zarządu i administratora.',
  'users.permissions.assign': 'Przypisuj jawne nadania i odmowy uprawnień.',
  'users.accounts.edit-email':
    'Zmień adres e-mail innego członka i wymagaj weryfikacji jako administrator.',
  'users.accounts.reset-password':
    'Wyślij link do odzyskania hasła innemu członkowi jako administrator.',
  'users.accounts.anonymize': 'Anonimizuj konta z zachowaniem treści koła.',
  'users.members.manage-profile': 'Edytuj profil innego członka jako administrator.',
  'projects.catalog.create': 'Twórz projekty i przypisuj ich początkowych liderów.',
  'projects.catalog.edit': 'Edytuj dane projektu i ustawienia tablicy jako lider.',
  'projects.membership.join': 'Dołączaj do otwartych projektów lub wysyłaj prośby do zamkniętych.',
  'projects.membership.manage':
    'Zarządzaj liderami, członkostwem i prośbami o dołączenie do projektu.',
  'projects.layout.edit': 'Zmieniaj kolejność i widoczność sekcji oraz linki projektu.',
  'projects.preview-credentials.read':
    'Wyświetlaj wygenerowane dane logowania do podglądów projektu.',
  'articles.content.propose': 'Twórz szkice i proponuj zmiany artykułów w swojej przestrzeni.',
  'articles.content.publish': 'Oceniaj propozycje i publikuj artykuły jako lider przestrzeni.',
  'articles.content.edit-any':
    'Edytuj dowolny artykuł w projekcie, także utworzony przez inną osobę.',
  'articles.authors.manage-credit': 'Decyduj, czy Twój wkład będzie podpisany publicznie.',
  'collaboration.items.contribute':
    'Twórz i edytuj zadania, wątki i komentarze w przestrzeniach, do których należysz.',
  'collaboration.items.restore':
    'Przywracaj usunięte zadania oraz archiwizuj i przywracaj wątki jako lider.',
  'collaboration.threads.restrict':
    'Zarządzaj widocznością zamkniętych wątków i zaproszeniami jako lider.',
  'audit.events.read': 'Czytaj historię zdarzeń dostępną w swojej przestrzeni.',
  'files.objects.upload': 'Przesyłaj pliki do treści, do których masz dostęp.',
  'association.alerts.manage': 'Zarządzaj ogłoszeniami i alertami koła.'
};
