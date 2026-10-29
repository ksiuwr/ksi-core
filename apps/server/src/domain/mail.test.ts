import { describe, expect, test } from 'bun:test';
import { notificationMail, resetPasswordMail, verifyEmailMail } from '../lib/mail';

const notification = {
  actorName: 'Alicja Nowak',
  action: 'kanban.comment.created',
  ownerType: 'item',
  projectName: 'Workflow project',
  changedFields: [],
  assignedNames: [],
  unassignedNames: [],
  reason: 'mention',
  title: 'Fix <login> & "SSO"',
  href: '/projects/workflow/tasks/12'
};

describe('account emails', () => {
  test('verification and reset messages carry the link in both parts', () => {
    const url = 'https://auth.example.test/api/auth/verify-email?token=a.b&callbackURL=x';
    const verify = verifyEmailMail(url);
    expect(verify.subject).toBe('KSI: Potwierdź adres e-mail');
    expect(verify.body).toContain(url);
    expect(verify.body).toContain('Link wygasa godzinę po wysłaniu prośby.');
    expect(verify.html).toContain(
      'href="https://auth.example.test/api/auth/verify-email?token=a.b&#38;callbackURL=x"'
    );
    expect(verify.html).not.toContain('token=a.b&callbackURL');
    const reset = resetPasswordMail('https://auth.example.test/reset/token');
    expect(reset.subject).toBe('KSI: Zresetuj hasło');
    expect(reset.body).toContain('Zmiana hasła wyloguje Cię ze wszystkich aktywnych sesji.');
  });
});

describe('notification emails', () => {
  test('describe the event and escape user content', () => {
    const mail = notificationMail(notification);
    expect(mail.subject).toBe('KSI: Fix <login> & "SSO" · Workflow project');
    expect(mail.body).toContain('Alicja Nowak dodał(a) komentarz.');
    expect(mail.body).toContain('/projects/workflow/tasks/12');
    expect(mail.body).toContain('wspomniano o Tobie w tym zadaniu');
    expect(mail.html).toContain('Fix &#60;login&#62; &#38; &#34;SSO&#34;');
    expect(mail.html).not.toContain('<login>');
    expect(mail.html).toContain('/settings#notifications');
  });
  test('subjects stay on one line and fall back to KSI outside projects', () => {
    const mail = notificationMail({
      ...notification,
      ownerType: 'thread',
      projectName: null,
      reason: 'update',
      title: 'Board\nmeeting  notes'
    });
    expect(mail.subject).toBe('KSI: Board meeting notes');
    expect(mail.body).toContain('KSI · Dyskusja');
    expect(mail.body).toContain('Otwórz dyskusję:');
  });
  test('deadline reminders show the due date in Wrocław time and notice overdue tasks', () => {
    const reminder = { ...notification, reason: 'deadline', dueAt: '2026-11-05T17:00:00.000Z' };
    const soon = notificationMail(reminder, new Date('2026-11-04T12:00:00Z'));
    expect(soon.body).toContain('Zbliża się termin tego zadania.');
    expect(soon.body).toContain('czwartek, 5 listopada 2026 18:00');
    expect(soon.body).not.toContain('Alicja Nowak');
    const late = notificationMail(reminder, new Date('2026-11-06T12:00:00Z'));
    expect(late.body).toContain('Termin tego zadania już minął.');
    const invalid = notificationMail({ ...reminder, dueAt: 'not a date' });
    expect(invalid.body).toContain('Alicja Nowak dodał(a) komentarz.');
  });
});
