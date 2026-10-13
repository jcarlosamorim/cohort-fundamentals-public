import { describe, it, expect } from 'vitest';

// Mirrors Leaderboard.displayName() logic from js/leaderboard.js
function displayName(r) {
  if (r.email) {
    const prefix = r.email.split('@')[0];
    if (prefix.length <= 2) return prefix + '***';
    return prefix.slice(0, 2) + '***';
  }
  if (r.user_id) return r.user_id.slice(0, 4) + '***';
  return 'Anônimo';
}

describe('Leaderboard displayName privacy', () => {
  it('masks email showing only first 2 chars', () => {
    expect(displayName({ email: 'jose@email.com' })).toBe('jo***');
  });

  it('masks longer email prefixes the same way', () => {
    expect(displayName({ email: 'carlos@domain.com' })).toBe('ca***');
  });

  it('handles short email prefixes (2 chars)', () => {
    expect(displayName({ email: 'ab@email.com' })).toBe('ab***');
  });

  it('handles very short email prefixes (1 char)', () => {
    expect(displayName({ email: 'a@email.com' })).toBe('a***');
  });

  it('falls back to masked user_id when no email', () => {
    expect(displayName({ user_id: 'abc123def456' })).toBe('abc1***');
  });

  it('uses first 4 chars of user_id', () => {
    expect(displayName({ user_id: 'xyz98765' })).toBe('xyz9***');
  });

  it('prefers email over user_id when both present', () => {
    expect(displayName({ email: 'jose@email.com', user_id: 'abc123' })).toBe('jo***');
  });

  it('returns Anônimo when no data', () => {
    expect(displayName({})).toBe('Anônimo');
  });

  it('returns Anônimo when undefined fields', () => {
    expect(displayName({ email: undefined, user_id: undefined })).toBe('Anônimo');
  });
});
