import { generateClient } from 'aws-amplify/api';
import type { GraphQLClient } from '../types/shared';

// Single-region clip service: asks the backend (mentorExport Lambda via the
// regionClipUrl @function query) to clip one region and return a short-lived
// presigned MP3 URL. The Lambda authorizes owner-or-public server-side.

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

const regionClipUrlQuery = /* GraphQL */ `
  query RegionClipUrl($regionId: ID!) {
    regionClipUrl(regionId: $regionId)
  }
`;

/**
 * Returns a presigned, short-lived URL to download the given region as an MP3.
 * Throws if the backend declines (e.g. not authorized) or returns nothing.
 */
export const getRegionClipUrl = async (regionId: string): Promise<string> => {
  const { data } = await getClient().graphql({
    query: regionClipUrlQuery,
    variables: { regionId },
    authMode: 'userPool',
  }) as { data: { regionClipUrl: string | null } };

  const url = data?.regionClipUrl;
  if (!url) {
    throw new Error('Could not generate the clip. Please try again.');
  }
  return url;
};
