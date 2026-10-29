import { getUrls } from 'shared';
import { notificationAction, type NotificationContext } from 'shared/notifications';

/** Matches the mail_jobs columns so a rendered message can be spread into an insert. */
export type Mail = { subject: string; body: string; html: string };
type Layout = {
  subject: string;
  preheader: string;
  eyebrow: string;
  context?: string;
  title: string;
  paragraph: string;
  detail?: { label: string; value: string };
  action: { href: string; label: string };
  showLink?: boolean;
  notes: string[];
  settings?: { href: string; label: string };
};

// Light and dark values mirror packages/ui/platform-theme.css so mail reads like the dashboard.
const light = {
  paper: '#f7f7f4',
  surface: '#ffffff',
  surfaceMuted: '#efefec',
  ink: '#25282b',
  muted: '#697177',
  line: '#d8dbd9',
  accent: '#a33d29',
  primary: '#ad422d',
  primaryBorder: '#8c3926',
  primaryText: '#fff8f4'
};
const dark = {
  paper: '#101214',
  surface: '#171a1d',
  surfaceMuted: '#22272c',
  ink: '#e6e8eb',
  muted: '#a0a9b0',
  line: '#30363b',
  accent: '#ed8a6d',
  primary: '#b74730',
  primaryText: '#fff1e8'
};
const fallback = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const font = `'Sora', ${fallback}`;
const display = `'Anybody', 'Sora', ${fallback}`;
const mono = "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const contact = 'ksi@cs.uni.wroc.pl';
const association = 'KSI UWr — Koło Studentów Informatyki Uniwersytetu Wrocławskiego';

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
const singleLine = (value: string) => value.replace(/\s+/g, ' ').trim();

function renderText(mail: Layout) {
  return [
    'KSI / core',
    '',
    mail.eyebrow.toUpperCase(),
    ...(mail.context ? [mail.context] : []),
    mail.title,
    '',
    mail.paragraph,
    '',
    ...(mail.detail ? [`${mail.detail.label}: ${mail.detail.value}`, ''] : []),
    `${mail.action.label}:`,
    mail.action.href,
    '',
    ...mail.notes,
    ...(mail.settings ? [`${mail.settings.label}: ${mail.settings.href}`] : []),
    '',
    '-- ',
    association,
    `${getUrls().frontend.landing} · ${contact}`,
    ''
  ].join('\n');
}

function renderHtml(mail: Layout) {
  const landing = getUrls().frontend.landing;
  const href = escape(mail.action.href);
  const context = mail.context
    ? `<p class="muted" style="margin:0 0 10px;font-family:${mono};font-size:11px;line-height:1.5;color:${light.muted};">${escape(mail.context)}</p>`
    : '';
  const detail = mail.detail
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;"><tr><td class="panel" style="padding:14px 16px;background:${light.surfaceMuted};border:1px solid ${light.line};border-radius:3px;">` +
      `<p class="muted" style="margin:0 0 6px;font-family:${mono};font-size:10px;line-height:1.5;letter-spacing:0.12em;text-transform:uppercase;color:${light.muted};">${escape(mail.detail.label)}</p>` +
      `<p class="ink" style="margin:0;font-family:${mono};font-size:13px;line-height:1.6;color:${light.ink};">${escape(mail.detail.value)}</p>` +
      '</td></tr></table>'
    : '';
  const button =
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;"><tr>` +
    `<td class="button" bgcolor="${light.primary}" style="border-radius:3px;background:${light.primary};border:1px solid ${light.primaryBorder};border-bottom-width:2px;">` +
    `<a href="${href}" class="button-link" style="display:inline-block;padding:12px 20px;font-family:${mono};font-size:12px;line-height:1.5;letter-spacing:0.025em;color:${light.primaryText};text-decoration:none;border-radius:3px;">${escape(mail.action.label)}</a>` +
    '</td></tr></table>';
  const link = mail.showLink
    ? `<p class="muted" style="margin:24px 0 8px;font-family:${font};font-size:12px;line-height:1.6;color:${light.muted};">Przycisk nie działa? Skopiuj ten link do przeglądarki.</p>` +
      `<p class="panel" style="margin:0;padding:10px 12px;background:${light.surfaceMuted};border:1px solid ${light.line};border-radius:3px;font-family:${mono};font-size:11px;line-height:1.6;word-break:break-all;"><a href="${href}" class="ink" style="color:${light.ink};text-decoration:none;">${href}</a></p>`
    : '';
  const notes = mail.notes
    .map(
      (note, index) =>
        `<p class="muted" style="margin:${index ? '10px' : '0'} 0 0;font-family:${font};font-size:12px;line-height:1.6;color:${light.muted};">${escape(note)}</p>`
    )
    .join('');
  const settings = mail.settings
    ? `<p style="margin:12px 0 0;font-family:${mono};font-size:11px;line-height:1.6;"><a href="${escape(mail.settings.href)}" class="accent" style="color:${light.accent};text-decoration:underline;">${escape(mail.settings.label)}</a></p>`
    : '';
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escape(mail.subject)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anybody:wght@600;700&amp;family=Sora:wght@400;600&amp;family=Space+Mono&amp;display=swap">
<style>
body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
a { color: ${light.accent}; }
@media (max-width: 620px) {
  .shell { padding: 24px 12px !important; }
  .card { padding: 28px 22px !important; }
}
@media (prefers-color-scheme: dark) {
  .page { background: ${dark.paper} !important; }
  .card { background: ${dark.surface} !important; border-color: ${dark.line} !important; }
  .panel { background: ${dark.surfaceMuted} !important; border-color: ${dark.line} !important; }
  .rule { border-color: ${dark.line} !important; }
  .ink { color: ${dark.ink} !important; }
  .muted { color: ${dark.muted} !important; }
  .accent { color: ${dark.accent} !important; }
  .button { background: ${dark.primary} !important; border-color: ${dark.primary} !important; }
  .button-link { color: ${dark.primaryText} !important; }
}
</style>
</head>
<body class="page" style="margin:0;padding:0;background:${light.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escape(mail.preheader)}${'&#847; &zwnj; '.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" style="background:${light.paper};">
<tr><td align="center" class="shell" style="padding:40px 16px;">
<!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px;">
<a href="${escape(landing)}" class="ink" style="font-family:${display};font-size:24px;line-height:1;font-weight:700;letter-spacing:-0.05em;color:${light.ink};text-decoration:none;">KSI<span class="muted" style="font-family:${mono};font-size:11px;font-weight:400;letter-spacing:0;color:${light.muted};"> / core</span></a>
</td></tr>
<tr><td class="card" style="padding:36px;background:${light.surface};border:1px solid ${light.line};border-radius:4px;">
<p class="muted" style="margin:0 0 18px;font-family:${mono};font-size:10px;line-height:1.5;letter-spacing:0.12em;text-transform:uppercase;color:${light.muted};"><span class="accent" style="color:${light.accent};">&#9679;</span>&nbsp; ${escape(mail.eyebrow)}</p>
${context}<h1 class="ink" style="margin:0;font-family:${display};font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.04em;color:${light.ink};">${escape(mail.title)}</h1>
<p class="ink" style="margin:20px 0 0;font-family:${font};font-size:15px;line-height:1.7;color:${light.ink};">${escape(mail.paragraph)}</p>
${detail}${button}${link}
<div class="rule" style="margin:32px 0 20px;height:0;border-top:1px solid ${light.line};font-size:0;line-height:0;">&nbsp;</div>
${notes}${settings}
</td></tr>
<tr><td style="padding:24px 4px 0;">
<p class="muted" style="margin:0;font-family:${font};font-size:11px;line-height:1.7;color:${light.muted};">${association}</p>
<p style="margin:8px 0 0;font-family:${mono};font-size:11px;line-height:1.7;"><a href="${escape(landing)}" class="accent" style="color:${light.accent};text-decoration:none;">${escape(new URL(landing).host)}</a><span class="muted" style="color:${light.muted};"> · </span><a href="mailto:${contact}" class="accent" style="color:${light.accent};text-decoration:none;">${contact}</a></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
`;
}

function render(mail: Layout): Mail {
  return { subject: mail.subject, body: renderText(mail), html: renderHtml(mail) };
}

const expiry = 'Link wygasa godzinę po wysłaniu prośby.';

export function verifyEmailMail(url: string): Mail {
  return render({
    subject: 'KSI: Potwierdź adres e-mail',
    preheader: 'Potwierdź adres, aby korzystać z konta KSI.',
    eyebrow: 'Konto',
    title: 'Potwierdź adres e-mail',
    paragraph: 'Potwierdź, że ten adres e-mail należy do Ciebie, aby móc korzystać z konta KSI.',
    action: { href: url, label: 'Potwierdź adres' },
    showLink: true,
    notes: [
      expiry,
      'Jeśli nie spodziewasz się tej wiadomości, możesz ją zignorować — adres nie zostanie potwierdzony.'
    ]
  });
}

export function resetPasswordMail(url: string): Mail {
  return render({
    subject: 'KSI: Zresetuj hasło',
    preheader: 'Ustaw nowe hasło do konta KSI.',
    eyebrow: 'Bezpieczeństwo',
    title: 'Zresetuj hasło',
    paragraph:
      'Poproszono o zresetowanie hasła do Twojego konta KSI. Użyj przycisku poniżej, aby ustawić nowe hasło.',
    action: { href: url, label: 'Ustaw nowe hasło' },
    showLink: true,
    notes: [
      `${expiry} Zmiana hasła wyloguje Cię ze wszystkich aktywnych sesji.`,
      'Jeśli prośba nie pochodzi od Ciebie, zignoruj tę wiadomość — obecne hasło pozostanie bez zmian.'
    ]
  });
}

export type NotificationMail = NotificationContext & {
  reason: string;
  title: string;
  href: string;
  dueAt?: string | null;
};

// Labels match the dashboard inbox so the email and the in-app notification read the same.
const reasonLabels: Record<string, string> = {
  deadline: 'Przypomnienie o terminie',
  mention: 'Wzmianka',
  assignment: 'Przypisanie',
  update: 'Aktualizacja'
};

function reasonNote(reason: string, thread: boolean) {
  if (reason === 'deadline') return 'Otrzymujesz tę wiadomość, ponieważ odpowiadasz za to zadanie.';
  if (reason === 'mention')
    return `Otrzymujesz tę wiadomość, ponieważ wspomniano o Tobie w ${thread ? 'tej dyskusji' : 'tym zadaniu'}.`;
  if (reason === 'assignment')
    return `Otrzymujesz tę wiadomość, ponieważ przypisano Cię do ${thread ? 'tej dyskusji' : 'tego zadania'}.`;
  return `Otrzymujesz tę wiadomość, ponieważ obserwujesz ${thread ? 'tę dyskusję' : 'to zadanie'}.`;
}

export function notificationMail(notification: NotificationMail, now = new Date()): Mail {
  const urls = getUrls();
  const thread = notification.ownerType === 'thread';
  const title = singleLine(notification.title);
  const scope = notification.projectName ? singleLine(notification.projectName) : 'KSI';
  const dueAt =
    notification.reason === 'deadline' && notification.dueAt ? new Date(notification.dueAt) : null;
  const due = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null;
  const summary = due
    ? due > now
      ? 'Zbliża się termin tego zadania.'
      : 'Termin tego zadania już minął.'
    : `${notificationAction(notification, 'pl')}.`;
  return render({
    subject: `KSI: ${title}${notification.projectName ? ` · ${scope}` : ''}`,
    preheader: summary,
    eyebrow: reasonLabels[notification.reason] ?? reasonLabels.update!,
    context: `${scope} · ${thread ? 'Dyskusja' : 'Zadanie'}`,
    title,
    paragraph: summary,
    ...(due
      ? {
          detail: {
            label: 'Termin',
            value: new Intl.DateTimeFormat('pl-PL', {
              dateStyle: 'full',
              timeStyle: 'short',
              timeZone: 'Europe/Warsaw'
            }).format(due)
          }
        }
      : {}),
    action: {
      href: `${urls.frontend.dashboard}${notification.href}`,
      label: thread ? 'Otwórz dyskusję' : 'Otwórz zadanie'
    },
    notes: [
      reasonNote(notification.reason, thread),
      'Wysyłamy e-maile tylko o powiadomieniach nieprzeczytanych w panelu.'
    ],
    settings: {
      href: `${urls.frontend.dashboard}/settings#notifications`,
      label: 'Ustawienia powiadomień'
    }
  });
}
