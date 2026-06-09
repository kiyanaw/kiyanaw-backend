import { generateClient } from 'aws-amplify/api';
import { remove } from 'aws-amplify/storage';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL queries/mutations are generated as JS files
import { createMedia as createMediaMutation, deleteMedia as deleteMediaMutation } from '../graphql/mutations.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getMedia as getMediaQuery } from '../graphql/queries.js';
import type { GraphQLClient } from '../types/shared';

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

export interface MediaData {
  id: string;
  pk: string;
  sk: string;
  owner: string;
  status: string;
  originalKey: string;
  renditionKey?: string | null;
  peaksKey?: string | null;
  thumbnailKey?: string | null;
  mimeType: string;
  fileSize: number;
  duration?: number | null;
  recordedAt?: string | null;
  _version?: number;
}

export interface CreateMediaParams {
  id: string;
  owner: string;
  originalKey: string;
  mimeType: string;
  fileSize: number;
  recordedAt?: string;
}

export const createMedia = async (params: CreateMediaParams): Promise<MediaData> => {
  const { id, owner, originalKey, mimeType, fileSize, recordedAt } = params;
  const pk = `USER#${owner}`;
  const sk = `MEDIA#${recordedAt ?? '0000-00-00'}#${id}`;

  const { data: result } = await getClient().graphql({
    query: createMediaMutation,
    variables: {
      input: { id, pk, sk, owner, status: 'PENDING', originalKey, mimeType, fileSize },
    },
    authMode: 'userPool',
  }) as { data: { createMedia: MediaData } };

  const created = result?.createMedia;
  if (!created) {
    throw new Error('Failed to create Media record');
  }
  return created;
};

export const getMedia = async (id: string): Promise<MediaData> => {
  const { data: result } = await getClient().graphql({
    query: getMediaQuery,
    variables: { id },
  }) as { data: { getMedia: MediaData } };

  const media = result?.getMedia;
  if (!media) {
    throw new Error(`Media record not found: ${id}`);
  }
  return media;
};

export const deleteMedia = async (id: string): Promise<void> => {
  const media = await getMedia(id);

  const keys = [media.originalKey, media.renditionKey, media.peaksKey, media.thumbnailKey];
  await Promise.all(
    keys
      .filter((k): k is string => !!k)
      .map(path => remove({ path }).catch(err => console.warn(`Failed to delete S3 object ${path}:`, err)))
  );

  await getClient().graphql({
    query: deleteMediaMutation,
    variables: { input: { id, _version: media._version } },
    authMode: 'userPool',
  });
};
