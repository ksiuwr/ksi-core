import { expect, test } from 'bun:test';
import { mentionedUserIds } from './mentions';
test('mentions exclude code, images, external links and duplicate recipients', () => {
  expect(
    mentionedUserIds(
      '[@Ada](/members/ada) [@Ada](/members/ada) `[@Code](/members/code)`\n```md\n[@Example](/members/example)\n```\n![image](/members/image) [link](https://example.com/members/other)'
    )
  ).toEqual(['ada']);
});
