import { AmplifyApiGraphQlResourceStackTemplate } from '@aws-amplify/cli-extensibility-helper';
import { CfnFunctionConfiguration, CfnResolver } from 'aws-cdk-lib/aws-appsync';

// ── VTL helpers ────────────────────────────────────────────────────────────────

// Shared ACL logic block (read access: author | editors | viewers | editorGroups | viewerGroups | Admins)
// Assumes $ctx.result = fetched Transcription, $userSub / $userGroups already set.
// Calls $util.unauthorized() if access denied; otherwise falls through.
export const READ_ACL_GUARD = `\
#if($t.isPrivate == true && !$userGroups.contains("Admins"))
  #set($hasAccess = false)
  #if(!$util.isNull($t.author) && $t.author == $userSub) #set($hasAccess = true) #end
  #if(!$hasAccess && !$util.isNull($t.editors) && $t.editors.contains($userSub)) #set($hasAccess = true) #end
  #if(!$hasAccess && !$util.isNull($t.viewers) && $t.viewers.contains($userSub)) #set($hasAccess = true) #end
  #if(!$hasAccess && !$util.isNull($t.editorGroups) && $util.list.copyAndRetain($t.editorGroups, $userGroups).size() > 0) #set($hasAccess = true) #end
  #if(!$hasAccess && !$util.isNull($t.viewerGroups) && $util.list.copyAndRetain($t.viewerGroups, $userGroups).size() > 0) #set($hasAccess = true) #end
  #if(!$hasAccess) $util.unauthorized() #end
#end`;

// Editor-only ACL guard (create/update/delete operations — viewers excluded)
const EDITOR_ACL_GUARD = `\
#set($hasAccess = false)
#if($userGroups.contains("Admins")) #set($hasAccess = true) #end
#if(!$hasAccess && !$util.isNull($t.author) && $t.author == $userSub) #set($hasAccess = true) #end
#if(!$hasAccess && !$util.isNull($t.editors) && $t.editors.contains($userSub)) #set($hasAccess = true) #end
#if(!$hasAccess && !$util.isNull($t.editorGroups) && $util.list.copyAndRetain($t.editorGroups, $userGroups).size() > 0) #set($hasAccess = true) #end
#if(!$hasAccess) $util.unauthorized() #end`;

// Identity extraction preamble shared by all ACL response templates
export const IDENTITY_PREAMBLE = `\
#set($userSub = $ctx.identity.claims.get("sub"))
#set($userGroups = $ctx.identity.claims.get("cognito:groups"))
#if($util.isNull($userSub)) #set($userSub = "") #end
#if($util.isNull($userGroups)) #set($userGroups = []) #end`;

// ── Per-resolver VTL ───────────────────────────────────────────────────────────

// getRegion: request — runs after the Region data function.
// $ctx.prev.result = fetched Region; stash it, then fetch parent Transcription.
const GET_REGION_ACL_REQ = `\
#set($region = $ctx.prev.result)
#if($util.isNull($region))
  $util.qr($ctx.stash.put("regionNull", true))
  $util.qr($ctx.stash.put("fetchedItem", null))
  {
    "version": "2018-05-29",
    "operation": "GetItem",
    "key": { "id": $util.dynamodb.toDynamoDBJson("__not_found__") }
  }
#else
  $util.qr($ctx.stash.put("regionNull", false))
  $util.qr($ctx.stash.put("fetchedItem", $region))
  {
    "version": "2018-05-29",
    "operation": "GetItem",
    "key": { "id": $util.dynamodb.toDynamoDBJson($region.transcriptionId) }
  }
#end`;

// getRegion: response — ACL check on fetched Transcription, returns Region or null.
const GET_REGION_ACL_RES = `\
#if($ctx.stash.get("regionNull") == true)
  $util.toJson(null)
#else
  #set($t = $ctx.result)
  #if($util.isNull($t)) $util.unauthorized() #end
  ${IDENTITY_PREAMBLE}
  ${READ_ACL_GUARD}
  $util.toJson($ctx.stash.get("fetchedItem"))
#end`;

// issuesByTranscription / commentsByTranscription: request — fetch Transcription by args.transcriptionId.
export const LIST_BY_TRANSCRIPTION_ACL_REQ = `\
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": { "id": $util.dynamodb.toDynamoDBJson($ctx.args.transcriptionId) }
}`;

// issuesByTranscription / commentsByTranscription: response — ACL check, pass through to data function.
export const LIST_BY_TRANSCRIPTION_ACL_RES = `\
#set($t = $ctx.result)
#if($util.isNull($t)) $util.unauthorized() #end
${IDENTITY_PREAMBLE}
${READ_ACL_GUARD}
$util.toJson({})`;

// createRegion: request — fetch Transcription by args.input.transcriptionId.
const CREATE_REGION_ACL_REQ = `\
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": { "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.transcriptionId) }
}`;

// createRegion: response — editor ACL check, pass through to data function.
const CREATE_REGION_ACL_RES = `\
#set($t = $ctx.result)
#if($util.isNull($t)) $util.unauthorized() #end
${IDENTITY_PREAMBLE}
${EDITOR_ACL_GUARD}
$util.toJson({})`;

// updateRegion / deleteRegion: request — fetch Transcription by stashed transcriptionId.
// (transcriptionId was stashed in the overridden auth.1.res.vtl)
const MUTATION_STASH_ACL_REQ = `\
#set($transcriptionId = $ctx.stash.get("transcriptionId"))
#if($util.isNull($transcriptionId) || $util.isNullOrEmpty($transcriptionId))
  $util.unauthorized()
#end
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": { "id": $util.dynamodb.toDynamoDBJson($transcriptionId) }
}`;

// updateRegion / deleteRegion: response — editor ACL check.
const MUTATION_STASH_ACL_RES = `\
#set($t = $ctx.result)
#if($util.isNull($t)) $util.unauthorized() #end
${IDENTITY_PREAMBLE}
${EDITOR_ACL_GUARD}
$util.toJson({})`;

// Admin-only deny: request — prepended to list/sync/byX queries that no client uses.
// Runs on the NONE data source; non-Admins stop here with Unauthorized.
export const ADMIN_ONLY_DENY_REQ = `\
${IDENTITY_PREAMBLE}
#if(!$userGroups.contains("Admins")) $util.unauthorized() #end
$util.toJson({"version": "2018-05-29", "payload": {}})`;

export const ADMIN_ONLY_DENY_RES = `\
$util.toJson({})`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFunctions(resolver: CfnResolver): string[] {
  return ((resolver.pipelineConfig as CfnResolver.PipelineConfigProperty)?.functions as string[]) ?? [];
}

function insertBeforeLast(fns: string[], newFnId: string): string[] {
  const pos = fns.length - 1;
  return [...fns.slice(0, pos), newFnId, ...fns.slice(pos)];
}

// The Transcription AppSync data source name is stable (set by transformer convention).
// We reference it by string rather than via cross-stack CDK token to avoid
// circular dependency errors between Amplify nested stacks.
const TRANSCRIPTION_DS_NAME = 'TranscriptionTable';
// The API's NONE data source (root stack, transformer convention).
const NONE_DS_NAME = 'NONE_DS';

function newFn(
  resolver: CfnResolver,
  logicalId: string,
  name: string,
  apiId: string,
  reqVtl: string,
  resVtl: string,
  dataSourceName: string = TRANSCRIPTION_DS_NAME,
): CfnFunctionConfiguration {
  return new CfnFunctionConfiguration(resolver.stack, logicalId, {
    apiId,
    dataSourceName,
    functionVersion: '2018-05-29',
    name,
    requestMappingTemplate: reqVtl,
    responseMappingTemplate: resVtl,
  });
}

// Looks up a generated resolver; throws so a renamed key fails the push instead of
// silently shipping the field unguarded.
function requireResolver(
  resources: AmplifyApiGraphQlResourceStackTemplate,
  model: string,
  key: string,
): CfnResolver {
  const resolver = resources.models?.[model]?.resolvers?.[key];
  if (!resolver) throw new Error(`override.ts: resolver ${model}.${key} not found`);
  return resolver;
}

// Prepends one shared Admin-only deny function (per model stack) to each resolver.
function denyNonAdmins(
  resources: AmplifyApiGraphQlResourceStackTemplate,
  apiId: string,
  model: string,
  fnName: string,
  resolverKeys: string[],
): void {
  const resolvers = resolverKeys.map((key) => requireResolver(resources, model, key));
  const denyFn = newFn(resolvers[0], fnName, fnName, apiId, ADMIN_ONLY_DENY_REQ, ADMIN_ONLY_DENY_RES, NONE_DS_NAME);
  for (const resolver of resolvers) {
    resolver.pipelineConfig = { functions: [denyFn.attrFunctionId, ...getFunctions(resolver)] };
  }
}

// ── Override entry point ───────────────────────────────────────────────────────

export function override(resources: AmplifyApiGraphQlResourceStackTemplate) {
  const apiId = resources.api?.GraphQLAPI?.attrApiId;
  if (!apiId) return;

  // ── getRegion: parent-ACL ─────────────────────────────────────────────────
  const getRegionResolver = resources.models?.['Region']?.resolvers?.['queryGetRegionResolver'];
  if (getRegionResolver) {
    const aclFn = newFn(
      getRegionResolver, 'GetRegionTranscriptionACLFn', 'GetRegionTranscriptionACLFn',
      apiId, GET_REGION_ACL_REQ, GET_REGION_ACL_RES,
    );
    // Append after the existing data function (last in pipeline)
    getRegionResolver.pipelineConfig = {
      functions: [...getFunctions(getRegionResolver), aclFn.attrFunctionId],
    };
  }

  // ── issuesByTranscription: parent-ACL ────────────────────────────────────────
  const issuesByTranscriptionResolver = resources.models?.['Issue']?.resolvers?.['queryIssuesByTranscriptionResolver'];
  if (issuesByTranscriptionResolver) {
    const aclFn = newFn(
      issuesByTranscriptionResolver, 'IssuesByTranscriptionACLFn', 'IssuesByTranscriptionACLFn',
      apiId, LIST_BY_TRANSCRIPTION_ACL_REQ, LIST_BY_TRANSCRIPTION_ACL_RES,
    );
    issuesByTranscriptionResolver.pipelineConfig = {
      functions: insertBeforeLast(getFunctions(issuesByTranscriptionResolver), aclFn.attrFunctionId),
    };
  }

  // ── regionsByTranscription: parent-ACL (audit C3.1) ──────────────────────────
  const regionsByTranscriptionResolver = requireResolver(resources, 'Region', 'queryRegionsByTranscriptionResolver');
  const regionsAclFn = newFn(
    regionsByTranscriptionResolver, 'RegionsByTranscriptionACLFn', 'RegionsByTranscriptionACLFn',
    apiId, LIST_BY_TRANSCRIPTION_ACL_REQ, LIST_BY_TRANSCRIPTION_ACL_RES,
  );
  regionsByTranscriptionResolver.pipelineConfig = {
    functions: insertBeforeLast(getFunctions(regionsByTranscriptionResolver), regionsAclFn.attrFunctionId),
  };

  // ── Unused list/sync/index queries: Admins only (audit C3.3) ─────────────────
  // No client calls these (app, portal, Mentor, Lambdas); they bypass the parent ACL.
  denyNonAdmins(resources, apiId, 'Region', 'RegionAdminOnlyDenyFn', [
    'queryListRegionsResolver',
    'querySyncRegionsResolver',
  ]);
  denyNonAdmins(resources, apiId, 'Transcription', 'TranscriptionAdminOnlyDenyFn', [
    'queryByTitleResolver',
    'queryTranscriptionsByMediaResolver',
    'querySyncTranscriptionsResolver',
  ]);

  // ── commentsByTranscription: parent-ACL ──────────────────────────────────────
  const commentsByTranscriptionResolver = resources.models?.['Comment']?.resolvers?.['queryCommentsByTranscriptionResolver'];
  if (commentsByTranscriptionResolver) {
    const aclFn = newFn(
      commentsByTranscriptionResolver, 'CommentsByTranscriptionACLFn', 'CommentsByTranscriptionACLFn',
      apiId, LIST_BY_TRANSCRIPTION_ACL_REQ, LIST_BY_TRANSCRIPTION_ACL_RES,
    );
    commentsByTranscriptionResolver.pipelineConfig = {
      functions: insertBeforeLast(getFunctions(commentsByTranscriptionResolver), aclFn.attrFunctionId),
    };
  }

  // ── createRegion: editor ACL ──────────────────────────────────────────────────
  const createRegionResolver = resources.models?.['Region']?.resolvers?.['mutationCreateRegionResolver'];
  if (createRegionResolver) {
    const aclFn = newFn(
      createRegionResolver, 'CreateRegionTranscriptionACLFn', 'CreateRegionTranscriptionACLFn',
      apiId, CREATE_REGION_ACL_REQ, CREATE_REGION_ACL_RES,
    );
    createRegionResolver.pipelineConfig = {
      functions: insertBeforeLast(getFunctions(createRegionResolver), aclFn.attrFunctionId),
    };
  }

  // ── updateRegion: editor ACL ──────────────────────────────────────────────────
  // transcriptionId is stashed by the Mutation.updateRegion.auth.1.res.vtl override
  const updateRegionResolver = resources.models?.['Region']?.resolvers?.['mutationUpdateRegionResolver'];
  if (updateRegionResolver) {
    const aclFn = newFn(
      updateRegionResolver, 'UpdateRegionTranscriptionACLFn', 'UpdateRegionTranscriptionACLFn',
      apiId, MUTATION_STASH_ACL_REQ, MUTATION_STASH_ACL_RES,
    );
    updateRegionResolver.pipelineConfig = {
      functions: insertBeforeLast(getFunctions(updateRegionResolver), aclFn.attrFunctionId),
    };
  }

  // ── deleteRegion: editor ACL ──────────────────────────────────────────────────
  // transcriptionId is stashed by the Mutation.deleteRegion.auth.1.res.vtl override
  const deleteRegionResolver = resources.models?.['Region']?.resolvers?.['mutationDeleteRegionResolver'];
  if (deleteRegionResolver) {
    const aclFn = newFn(
      deleteRegionResolver, 'DeleteRegionTranscriptionACLFn', 'DeleteRegionTranscriptionACLFn',
      apiId, MUTATION_STASH_ACL_REQ, MUTATION_STASH_ACL_RES,
    );
    deleteRegionResolver.pipelineConfig = {
      functions: insertBeforeLast(getFunctions(deleteRegionResolver), aclFn.attrFunctionId),
    };
  }

  // ── createExport: parent-transcription editor ACL ────────────────────────────
  // Export's @auth(owner) only checks the export's own `owner` field — it does NOT
  // verify the caller may access the transcription being exported. Without this,
  // a user could create an export for someone else's PRIVATE transcription (setting
  // owner=self to pass owner-auth) and the mentorExport Lambda would hand them a zip
  // of that private audio. Guard it like createRegion: fetch the parent Transcription
  // (by args.input.transcriptionId) and require owner/editor/Admin access.
  const createExportResolver = resources.models?.['Export']?.resolvers?.['mutationCreateExportResolver'];
  if (createExportResolver) {
    const aclFn = newFn(
      createExportResolver, 'CreateExportTranscriptionACLFn', 'CreateExportTranscriptionACLFn',
      apiId, CREATE_REGION_ACL_REQ, CREATE_REGION_ACL_RES,
    );
    createExportResolver.pipelineConfig = {
      functions: insertBeforeLast(getFunctions(createExportResolver), aclFn.attrFunctionId),
    };
  }

  // ── issuesByRegion: parent-ACL (deferred) ────────────────────────────────────
  // Requires two-hop lookup: regionId → Region → transcriptionId → Transcription.
  // The Region data source is not directly available in the Issue stack without
  // additional cross-stack parameter passing.
}
