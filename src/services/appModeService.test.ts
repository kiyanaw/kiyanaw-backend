import { detectAppMode, editorPath, localModeCsp } from './appModeService';

describe('detectAppMode', () => {
  it.each([
    ['/local', 'local'],
    ['/local/', 'local'],
    ['/local/edit/abc', 'local'],
    ['/', 'cloud'],
    ['/transcribe-list', 'cloud'],
    ['/localish', 'cloud'],
  ])('%s -> %s', (path, mode) => {
    expect(detectAppMode(path)).toBe(mode);
  });
});

describe('localModeCsp', () => {
  it('only allows the app origin, blob: and data: for connections', () => {
    expect(localModeCsp(false)).toContain("connect-src 'self' blob: data:;");
    expect(localModeCsp(false)).not.toContain('ws:');
  });

  it('allows the dev server socket only when asked', () => {
    expect(localModeCsp(true)).toContain("connect-src 'self' blob: data: ws: wss:");
  });
});

describe('editorPath', () => {
  it('builds cloud and local editor URLs', () => {
    expect(editorPath('cloud', 't1', 'r1')).toBe('/transcribe-edit/t1/r1');
    expect(editorPath('local', 't1', 'r1')).toBe('/local/edit/t1/r1');
    expect(editorPath('local', 't1')).toBe('/local/edit/t1');
  });
});
