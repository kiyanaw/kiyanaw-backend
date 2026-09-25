import { generateClient } from 'aws-amplify/api';
import { remove } from 'aws-amplify/storage';
import { generateSignedUrlFromKey } from './transcriptionService';
import type { GraphQLClient } from '../types/shared';

// Export ("Export to Mentor") lifecycle service. Mirrors mediaService: stateless
// functions over a lazily-created GraphQL client, returning plain typed data.
//
// The Export record's id IS the transcriptionId, so there is only ever one export
// per transcription. GraphQL operations are defined inline (rather than imported
// from generated files) so this service does not depend on `amplify codegen`
// having run for the brand-new Export model.

export const EXPORT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  ERROR: 'ERROR',
} as const;

export type ExportStatus = typeof EXPORT_STATUS[keyof typeof EXPORT_STATUS];

export interface ExportData {
  id: string;            // auto-generated UUID (NOT the transcriptionId)
  transcriptionId: string;
  owner: string;
  status: string;
  speaker?: string | null;
  progress?: number | null;
  total?: number | null;
  downloadKey?: string | null;
  error?: string | null;
  _version?: number;
  _deleted?: boolean | null;
}

export interface CreateExportParams {
  transcriptionId: string;
  owner: string;
  speaker: string;
}

const EXPORT_FIELDS = `
  id
  transcriptionId
  owner
  status
  speaker
  progress
  total
  downloadKey
  error
  _version
  _deleted
`;

const exportsByTranscriptionQuery = /* GraphQL */ `
  query ExportsByTranscription($transcriptionId: ID!) {
    exportsByTranscription(transcriptionId: $transcriptionId) {
      items {
        ${EXPORT_FIELDS}
      }
    }
  }
`;

const createExportMutation = /* GraphQL */ `
  mutation CreateExport($input: CreateExportInput!) {
    createExport(input: $input) {
      ${EXPORT_FIELDS}
    }
  }
`;

const deleteExportMutation = /* GraphQL */ `
  mutation DeleteExport($input: DeleteExportInput!) {
    deleteExport(input: $input) {
      id
    }
  }
`;

let client: GraphQLClient | null = null;
const getClient = (): GraphQLClient => {
  if (!client) {
    client = generateClient() as GraphQLClient;
  }
  return client;
};

export const __resetClient = () => {
  client = null;
};

/**
 * Fetch the current (live) export for a transcription via the exportsByTranscription
 * GSI. Soft-deleted tombstones (_deleted) are filtered out. Returns null when none.
 */
export const getExportByTranscription = async (transcriptionId: string): Promise<ExportData | null> => {
  const { data: result } = await getClient().graphql({
    query: exportsByTranscriptionQuery,
    variables: { transcriptionId },
  }) as { data: { exportsByTranscription: { items: ExportData[] } | null } };

  const items = (result?.exportsByTranscription?.items ?? []).filter(item => !item._deleted);
  if (items.length === 0) {
    return null;
  }
  // At most one should be live; if several exist, prefer the most recently updated.
  return items.sort((a, b) => (b._version ?? 0) - (a._version ?? 0))[0];
};

/**
 * Queue a new export. The id is auto-generated (a fresh UUID each time), so a prior
 * deleted export's tombstone never blocks creating another for the same transcription.
 */
export const createExport = async (params: CreateExportParams): Promise<ExportData> => {
  const { transcriptionId, owner, speaker } = params;

  const { data: result } = await getClient().graphql({
    query: createExportMutation,
    variables: {
      input: {
        transcriptionId,
        owner,
        speaker,
        status: EXPORT_STATUS.PENDING,
        progress: 0,
      },
    },
    authMode: 'userPool',
  }) as { data: { createExport: ExportData } };

  const created = result?.createExport;
  if (!created) {
    throw new Error('Failed to create Export record');
  }
  return created;
};

/**
 * Delete the export: remove the generated zip from S3 (if present), then delete
 * the record. Frees the slot so another export can be queued.
 */
export const deleteExport = async (exportRecord: ExportData): Promise<void> => {
  if (exportRecord.downloadKey) {
    await remove({ path: exportRecord.downloadKey }).catch(err =>
      console.warn(`Failed to delete export zip ${exportRecord.downloadKey}:`, err)
    );
  }

  await getClient().graphql({
    query: deleteExportMutation,
    variables: { input: { id: exportRecord.id, _version: exportRecord._version } },
    authMode: 'userPool',
  });
};

/**
 * Generate a fresh signed URL for the finished zip.
 */
export const getExportDownloadUrl = async (downloadKey: string): Promise<string> => {
  return generateSignedUrlFromKey(downloadKey);
};
