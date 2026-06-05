import { buildFinishMessage, serializeError } from './slack.js';

describe('serializeError', () => {
  it('returns string as-is', () => {
    expect(serializeError('some error')).toBe('some error');
  });

  it('extracts message from object with message field', () => {
    expect(serializeError({ message: 'something went wrong', code: 42 })).toBe('something went wrong');
  });

  it('JSON-stringifies objects without a message field', () => {
    expect(serializeError({ code: 'ERR_FAIL', details: 'bad' })).toBe('{"code":"ERR_FAIL","details":"bad"}');
  });

  it('handles null', () => {
    expect(serializeError(null)).toBe('null');
  });
});

describe('buildFinishMessage with object error', () => {
  const base = {
    envName: 'staging',
    lifecycle: 'publish',
    gitUser: 'Dan Fay',
    branch: 'staging',
    sha: 'abc1234',
    success: false,
    stage: 'amplify publish',
    durationMs: 81000,
  };

  it('does not show [object Object] when error is an object with a message', () => {
    const msg = buildFinishMessage({ ...base, error: serializeError({ message: 'Deploy failed: stack rollback' }) });
    expect(msg).toContain('Deploy failed: stack rollback');
    expect(msg).not.toContain('[object Object]');
  });

  it('does not show [object Object] when error is a plain object', () => {
    const msg = buildFinishMessage({ ...base, error: serializeError({ code: 'ERR_DEPLOY', reason: 'timeout' }) });
    expect(msg).not.toContain('[object Object]');
    expect(msg).toContain('ERR_DEPLOY');
  });
});
