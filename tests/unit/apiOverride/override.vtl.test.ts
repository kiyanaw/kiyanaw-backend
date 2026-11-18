// Renders the C3 VTL from override.ts with velocityjs and a minimal AppSync $util,
// so the ACL decisions can be checked without deploying.
// Requires the dev dependency: npm i -D velocityjs

import { render } from 'velocityjs';

jest.mock('aws-cdk-lib/aws-appsync', () => ({ CfnFunctionConfiguration: class {}, CfnResolver: class {} }), { virtual: true });
jest.mock('@aws-amplify/cli-extensibility-helper', () => ({}), { virtual: true });

import {
  ADMIN_ONLY_DENY_REQ,
  ADMIN_ONLY_DENY_RES,
  LIST_BY_TRANSCRIPTION_ACL_REQ,
  LIST_BY_TRANSCRIPTION_ACL_RES,
} from '../../../amplify/backend/api/kiyanaw/override';

// Java-style list, as AppSync exposes JSON arrays to VTL.
class JavaList<T> extends Array<T> {
  contains(value: T): boolean {
    return this.includes(value);
  }
  size(): number {
    return this.length;
  }
}

const list = <T,>(items: T[]): JavaList<T> => JavaList.from(items) as JavaList<T>;

class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

const util = {
  isNull: (v: unknown): boolean => v === null || v === undefined,
  isNullOrEmpty: (v: unknown): boolean => v === null || v === undefined || v === '',
  toJson: (v: unknown): string => JSON.stringify(v),
  qr: (): string => '',
  unauthorized: (): never => {
    throw new UnauthorizedError();
  },
  dynamodb: { toDynamoDBJson: (v: string): string => JSON.stringify({ S: v }) },
  list: {
    copyAndRetain: <T,>(a: T[], b: T[]): JavaList<T> => list(a.filter((x) => b.includes(x))),
  },
};

interface Caller {
  sub: string;
  groups: string[];
}

interface TranscriptionRow {
  id: string;
  isPrivate: boolean;
  author: string;
  editors: JavaList<string>;
  viewers: JavaList<string>;
  editorGroups: JavaList<string> | null;
  viewerGroups: JavaList<string> | null;
}

const A: Caller = { sub: 'sub-a', groups: [] };
const B: Caller = { sub: 'sub-b', groups: [] };
const EDITOR: Caller = { sub: 'sub-editor', groups: [] };
const VIEWER: Caller = { sub: 'sub-viewer', groups: [] };
const ADMIN: Caller = { sub: 'sub-admin', groups: ['Admins'] };
const CLASS_MEMBER: Caller = { sub: 'sub-student', groups: ['class-101'] };

function transcription(isPrivate: boolean): TranscriptionRow {
  return {
    id: 't-1',
    isPrivate,
    author: A.sub,
    editors: list([EDITOR.sub]),
    viewers: list([VIEWER.sub]),
    editorGroups: null,
    viewerGroups: list(['class-101']),
  };
}

function ctxFor(caller: Caller, result: unknown) {
  const claims: Record<string, unknown> = { sub: caller.sub, 'cognito:groups': list(caller.groups) };
  return {
    args: { transcriptionId: 't-1' },
    identity: { claims: { get: (k: string): unknown => claims[k] } },
    result,
    prev: { result: null },
    stash: {},
  };
}

const run = (tpl: string, caller: Caller, result: unknown = null): string =>
  render(tpl, { ctx: ctxFor(caller, result), util }).trim();

describe('regionsByTranscription parent-ACL guard', () => {
  it('request fetches the parent Transcription by args.transcriptionId', () => {
    const req = JSON.parse(run(LIST_BY_TRANSCRIPTION_ACL_REQ, B));
    expect(req).toEqual({ version: '2018-05-29', operation: 'GetItem', key: { id: { S: 't-1' } } });
  });

  it('denies account B on A\'s private transcription', () => {
    expect(() => run(LIST_BY_TRANSCRIPTION_ACL_RES, B, transcription(true))).toThrow(UnauthorizedError);
  });

  it.each([
    ['author A', A],
    ['editor', EDITOR],
    ['viewer', VIEWER],
    ['Admin', ADMIN],
    ['viewer group member', CLASS_MEMBER],
  ])('allows %s on a private transcription', (_label, caller) => {
    expect(run(LIST_BY_TRANSCRIPTION_ACL_RES, caller, transcription(true))).toBe('{}');
  });

  it('allows any signed-in user on a non-private transcription', () => {
    expect(run(LIST_BY_TRANSCRIPTION_ACL_RES, B, transcription(false))).toBe('{}');
  });

  it('denies when the parent transcription does not exist', () => {
    expect(() => run(LIST_BY_TRANSCRIPTION_ACL_RES, A, null)).toThrow(UnauthorizedError);
  });
});

describe('Admin-only deny function (listRegions, syncRegions, byTitle, transcriptionsByMedia, syncTranscriptions)', () => {
  it.each([
    ['account B', B],
    ['author A', A],
    ['editor', EDITOR],
    ['viewer', VIEWER],
  ])('denies %s', (_label, caller) => {
    expect(() => run(ADMIN_ONLY_DENY_REQ, caller)).toThrow(UnauthorizedError);
  });

  it('lets Admins through to the generated pipeline', () => {
    expect(JSON.parse(run(ADMIN_ONLY_DENY_REQ, ADMIN))).toEqual({ version: '2018-05-29', payload: {} });
    expect(run(ADMIN_ONLY_DENY_RES, ADMIN)).toBe('{}');
  });
});
