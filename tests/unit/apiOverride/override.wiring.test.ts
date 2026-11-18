// Asserts override() wires the C3 guard and deny functions onto the right resolvers.
// aws-cdk-lib and cli-extensibility-helper ship inside the Amplify CLI, not node_modules,
// so CfnFunctionConfiguration is replaced with a recorder.

interface RecordedFn {
  scope: unknown;
  logicalId: string;
  props: { dataSourceName: string; requestMappingTemplate: string; responseMappingTemplate: string };
  attrFunctionId: string;
}

const created: RecordedFn[] = [];

jest.mock(
  'aws-cdk-lib/aws-appsync',
  () => ({
    CfnFunctionConfiguration: class {
      attrFunctionId: string;
      constructor(scope: unknown, logicalId: string, props: RecordedFn['props']) {
        this.attrFunctionId = `fn:${logicalId}`;
        created.push({ scope, logicalId, props, attrFunctionId: this.attrFunctionId });
      }
    },
    CfnResolver: class {},
  }),
  { virtual: true },
);
jest.mock('@aws-amplify/cli-extensibility-helper', () => ({}), { virtual: true });

import {
  override,
  ADMIN_ONLY_DENY_REQ,
  LIST_BY_TRANSCRIPTION_ACL_REQ,
  LIST_BY_TRANSCRIPTION_ACL_RES,
} from '../../../amplify/backend/api/kiyanaw/override';

interface StubResolver {
  stack: { name: string };
  pipelineConfig: { functions: string[] };
}

type Resources = Parameters<typeof override>[0];

function stubResolver(model: string, field: string): StubResolver {
  return { stack: { name: `${model}Stack` }, pipelineConfig: { functions: [`auth:${field}`, `postAuth:${field}`, `data:${field}`] } };
}

const RESOLVER_KEYS: Record<string, string[]> = {
  Region: [
    'queryGetRegionResolver', 'queryRegionsByTranscriptionResolver', 'queryListRegionsResolver',
    'querySyncRegionsResolver', 'mutationCreateRegionResolver', 'mutationUpdateRegionResolver',
    'mutationDeleteRegionResolver',
  ],
  Transcription: ['queryByTitleResolver', 'queryTranscriptionsByMediaResolver', 'querySyncTranscriptionsResolver'],
  Issue: ['queryIssuesByTranscriptionResolver'],
  Comment: ['queryCommentsByTranscriptionResolver'],
  Export: ['mutationCreateExportResolver'],
};

function buildResources(omit?: string): { resources: Resources; resolvers: Record<string, StubResolver> } {
  const resolvers: Record<string, StubResolver> = {};
  const models: Record<string, { resolvers: Record<string, StubResolver> }> = {};
  for (const [model, keys] of Object.entries(RESOLVER_KEYS)) {
    models[model] = { resolvers: {} };
    for (const key of keys) {
      if (key === omit) continue;
      const r = stubResolver(model, key);
      models[model].resolvers[key] = r;
      resolvers[key] = r;
    }
  }
  const stub = { api: { GraphQLAPI: { attrApiId: 'api-123' } }, models };
  return { resources: stub as unknown as Resources, resolvers };
}

describe('override() C3 wiring', () => {
  beforeEach(() => {
    created.length = 0;
  });

  it('inserts the parent-ACL guard before the data function of regionsByTranscription', () => {
    const { resources, resolvers } = buildResources();
    override(resources);
    const fn = created.find((f) => f.logicalId === 'RegionsByTranscriptionACLFn');
    expect(fn).toBeDefined();
    expect(fn?.props.dataSourceName).toBe('TranscriptionTable');
    expect(fn?.props.requestMappingTemplate).toBe(LIST_BY_TRANSCRIPTION_ACL_REQ);
    expect(fn?.props.responseMappingTemplate).toBe(LIST_BY_TRANSCRIPTION_ACL_RES);
    expect(resolvers.queryRegionsByTranscriptionResolver.pipelineConfig.functions).toEqual([
      'auth:queryRegionsByTranscriptionResolver',
      'postAuth:queryRegionsByTranscriptionResolver',
      'fn:RegionsByTranscriptionACLFn',
      'data:queryRegionsByTranscriptionResolver',
    ]);
  });

  it.each([
    ['queryListRegionsResolver', 'RegionAdminOnlyDenyFn'],
    ['querySyncRegionsResolver', 'RegionAdminOnlyDenyFn'],
    ['queryByTitleResolver', 'TranscriptionAdminOnlyDenyFn'],
    ['queryTranscriptionsByMediaResolver', 'TranscriptionAdminOnlyDenyFn'],
    ['querySyncTranscriptionsResolver', 'TranscriptionAdminOnlyDenyFn'],
  ])('prepends the Admin-only deny function to %s', (key, fnId) => {
    const { resources, resolvers } = buildResources();
    override(resources);
    expect(resolvers[key].pipelineConfig.functions).toEqual([
      `fn:${fnId}`, `auth:${key}`, `postAuth:${key}`, `data:${key}`,
    ]);
  });

  it('creates one deny function per model stack, on the NONE data source', () => {
    const { resources } = buildResources();
    override(resources);
    const denyFns = created.filter((f) => f.logicalId.endsWith('AdminOnlyDenyFn'));
    expect(denyFns.map((f) => f.logicalId).sort()).toEqual(['RegionAdminOnlyDenyFn', 'TranscriptionAdminOnlyDenyFn']);
    for (const f of denyFns) {
      expect(f.props.dataSourceName).toBe('NONE_DS');
      expect(f.props.requestMappingTemplate).toBe(ADMIN_ONLY_DENY_REQ);
    }
    expect(denyFns.find((f) => f.logicalId === 'RegionAdminOnlyDenyFn')?.scope).toEqual({ name: 'RegionStack' });
    expect(denyFns.find((f) => f.logicalId === 'TranscriptionAdminOnlyDenyFn')?.scope).toEqual({ name: 'TranscriptionStack' });
  });

  it('leaves transcription reads used by the app and portal untouched', () => {
    const { resources, resolvers } = buildResources();
    override(resources);
    expect(resolvers.queryIssuesByTranscriptionResolver.pipelineConfig.functions).not.toContain('fn:RegionAdminOnlyDenyFn');
    expect(created.some((f) => /transcriptionsByAuthor|GetTranscription/i.test(f.logicalId))).toBe(false);
  });

  it.each([
    'queryRegionsByTranscriptionResolver',
    'queryListRegionsResolver',
    'querySyncTranscriptionsResolver',
  ])('fails the build when %s is missing', (key) => {
    const { resources } = buildResources(key);
    expect(() => override(resources)).toThrow(`not found`);
  });
});
