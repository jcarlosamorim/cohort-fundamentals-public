import { describe, it, expect } from 'vitest';

// Test the path mapping logic (mirrors Router internals)
function pathToFile(path) {
  if (path === '/calendario') return 'pages/calendario.html';
  if (path === '/downloads') return 'pages/downloads.html';
  if (path === '/psicometria') return 'pages/psicometria.html';
  const match = path.match(/^\/aula\/(\d+)\/(.+)$/);
  if (match) return `pages/e${match[1]}-${match[2]}.html`;
  return null;
}

function isSafePath(file) {
  return /^pages\/[a-z0-9._-]+\.html$/.test(file);
}

describe('Router path mapping', () => {
  it('maps /aula/1/fundacao to pages/e1-fundacao.html', () => {
    expect(pathToFile('/aula/1/fundacao')).toBe('pages/e1-fundacao.html');
  });

  it('maps /aula/1/fluxos to pages/e1-fluxos.html', () => {
    expect(pathToFile('/aula/1/fluxos')).toBe('pages/e1-fluxos.html');
  });

  it('maps /calendario to pages/calendario.html', () => {
    expect(pathToFile('/calendario')).toBe('pages/calendario.html');
  });

  it('maps /downloads to pages/downloads.html', () => {
    expect(pathToFile('/downloads')).toBe('pages/downloads.html');
  });

  it('maps /psicometria to pages/psicometria.html', () => {
    expect(pathToFile('/psicometria')).toBe('pages/psicometria.html');
  });

  it('returns null for unknown paths', () => {
    expect(pathToFile('/unknown')).toBeNull();
  });

  it('returns null for /aula/1 (overview, no lesson)', () => {
    expect(pathToFile('/aula/1')).toBeNull();
  });

  it('returns null for root path', () => {
    expect(pathToFile('/')).toBeNull();
  });
});

describe('Router isSafePath', () => {
  it('accepts valid page paths', () => {
    expect(isSafePath('pages/e1-fundacao.html')).toBe(true);
    expect(isSafePath('pages/calendario.html')).toBe(true);
    expect(isSafePath('pages/e2-fluxos.html')).toBe(true);
  });

  it('accepts paths with dots and underscores', () => {
    expect(isSafePath('pages/my_page.v2.html')).toBe(true);
  });

  it('rejects path traversal', () => {
    expect(isSafePath('../etc/passwd')).toBe(false);
    expect(isSafePath('pages/../../../etc/passwd')).toBe(false);
  });

  it('rejects uppercase characters', () => {
    expect(isSafePath('pages/E1-Fundacao.html')).toBe(false);
  });

  it('rejects non-html extensions', () => {
    expect(isSafePath('pages/script.js')).toBe(false);
  });

  it('rejects nested directories', () => {
    expect(isSafePath('pages/sub/page.html')).toBe(false);
  });

  it('rejects paths not starting with pages/', () => {
    expect(isSafePath('other/page.html')).toBe(false);
  });
});
