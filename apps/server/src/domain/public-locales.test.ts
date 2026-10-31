import { expect, test } from 'bun:test';
import { publicProfile } from '../routes/platform/content';
test('translated names retain public privacy and never expose protected name fields', () => {
  // Only the fields publicProfile reads; the rest of the row is irrelevant here.
  const member = {
    id: 'test',
    name: 'Jan Kowalski',
    firstName: 'Jan',
    lastName: 'Kowalski',
    nickname: null,
    bio: 'Polski opis',
    publicPrivacy: 'last-initial',
    membershipStatus: 'active',
    translations: { en: { firstName: 'John', lastName: 'Smith', bio: 'English bio' } }
  } as Partial<Parameters<typeof publicProfile>[0]> as Parameters<typeof publicProfile>[0];
  expect(publicProfile(member)).toMatchObject({ name: 'Jan K.', bio: 'Polski opis' });
  expect(publicProfile(member, 'en-us')).toMatchObject({ name: 'John S.', bio: 'English bio' });
  expect(publicProfile(member, 'en-us')).not.toHaveProperty('translations');
  member.publicPrivacy = 'initials';
  expect(publicProfile(member, 'en-us').name).toBe('J. S.');
  member.membershipStatus = 'deleted';
  member.name = 'Member random123';
  member.bio = null;
  expect(publicProfile(member, 'en-us').name).toBe('Member random123');
});
