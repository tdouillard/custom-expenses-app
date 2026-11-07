import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarPath, avatarProblem, AVATAR_MAX_BYTES } from '../../src/core/avatar.js';

test('only JPEG, PNG and WebP pictures up to 2 MB are accepted', () => {
  assert.equal(avatarProblem({ type: 'image/png', size: 1000 }), '');
  assert.equal(avatarProblem({ type: 'image/webp', size: AVATAR_MAX_BYTES }), '');
  assert.equal(avatarProblem({ type: 'image/svg+xml', size: 1000 }), 'account.photoType');
  assert.equal(avatarProblem({ type: 'text/html', size: 1000 }), 'account.photoType');
  assert.equal(avatarProblem({ type: 'image/jpeg', size: AVATAR_MAX_BYTES + 1 }), 'account.photoSize');
});

test('each user has exactly one photo path, matching the storage policy', () => {
  assert.equal(avatarPath('8f1c-user'), '8f1c-user/avatar.jpg');
});
