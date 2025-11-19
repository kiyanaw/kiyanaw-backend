import { post } from 'aws-amplify/api';
import type { 
  DatabaseStats, 
  LemmaDetails, 
  SurfaceForm, 
  Attestation,
  SearchResponse
} from './adt';

// Helper function to make requests to the OpenSearch proxy Lambda
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeProxyRequest = async (action: string, params?: any): Promise<any> => {
  try {
    const operation = post({
      apiName: 'opensearchproxy',
      path: '/search',
      options: {
        body: {
          action,
          params
        }
      }
    });

    const response = await operation.response;
    const data = await response.body.json() as { success: boolean; error?: string; data: unknown };

    if (!data.success) {
      throw new Error(data.error || 'Unknown error from database proxy');
    }

    return data.data;
  } catch (error) {
    console.error('Database proxy request failed:', error);
    throw error;
  }
};



/**
 * Get database statistics for the homepage
 * @param lang Optional language filter (crk, crgn)
 * @returns Promise<DatabaseStats>
 */
export const getDatabaseStats = async (lang?: string): Promise<DatabaseStats> => {
  console.log('🔍 Getting database stats for language:', lang || 'all');
  
  try {
    const stats = await makeProxyRequest('getDatabaseStats', { lang });
    console.log('📊 Database stats retrieved:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    throw new Error(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get details for a specific lemma including surface forms
 * @param lemma The lemma to look up
 * @param lang Optional language filter
 * @returns Promise<LemmaDetails>
 */
export const getLemmaDetails = async (lemma: string, lang?: string): Promise<LemmaDetails> => {
  console.log(`🔍 Loading lemma details for: ${lemma}${lang ? ` (${lang})` : ''}`);
  
  try {
    const details = await makeProxyRequest('getLemmaDetails', { lemma, lang });
    console.log(`📝 Lemma details retrieved for "${lemma}":`, details);
    return details;
  } catch (error) {
    console.error('❌ Error getting lemma details:', error);
    throw new Error(`Failed to get lemma details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get surface forms for a lemma
 * @param lemma The lemma to get surface forms for
 * @param lang Optional language filter
 * @returns Promise<SurfaceForm[]>
 */
export const getSurfaceForms = async (lemma: string, lang?: string): Promise<SurfaceForm[]> => {
  console.log(`📝 Loading surface forms for lemma: ${lemma}${lang ? ` (${lang})` : ''}`);
  
  // This function is now handled by getLemmaDetails - keeping for backward compatibility
  const lemmaDetails = await getLemmaDetails(lemma, lang);
  return lemmaDetails.surfaceForms;
};

/**
 * Get attestations for a specific lemma and surface form combination
 * @param lemma The lemma
 * @param surface The surface form
 * @param lang Optional language filter
 * @returns Promise<Attestation[]>
 */
export const getAttestations = async (
  lemma: string, 
  surface: string, 
  lang?: string,
  page: number = 1,
  limit: number = 20
): Promise<Attestation[]> => {
  console.log(`📋 Loading attestations for: ${lemma} -> ${surface}${lang ? ` (${lang})` : ''}`);
  
  try {
    const attestations = await makeProxyRequest('getAttestations', { lemma, surface, lang, page, limit });
    console.log(`📋 Attestations retrieved for "${lemma} -> ${surface}":`, attestations.length);
    return attestations;
  } catch (error) {
    console.error('❌ Error getting attestations:', error);
    throw new Error(`Failed to get attestations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Search the database for text examples (attestations) matching a query
 * @param query Search query string
 * @param lang Optional language filter
 * @param page Page number for pagination
 * @param limit Results per page
 * @returns Promise<Attestation[]>
 */
export const searchDatabase = async (
  query: string, 
  lang?: string,
  page: number = 1,
  limit: number = 50
): Promise<SearchResponse> => {
  console.log(`🔎 Searching database for: "${query}"${lang ? ` (${lang})` : ''}`);
  
  if (!query.trim()) {
    return { results: [], page: 1, limit, hasMore: false };
  }
  
  try {
    const response = await makeProxyRequest('searchDatabase', { query, lang, page, limit });
    console.log(`🔍 Search results for "${query}":`, response.results?.length || 0, 'attestations (page', page + ')');
    return response;
  } catch (error) {
    console.error('❌ Error searching database:', error);
    throw new Error(`Failed to search database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Implementation notes:
 * 
 * This service uses a Lambda proxy to query OpenSearch.
 * The Lambda function handles authentication and executes queries server-side.
 * 
 * Architecture:
 * 1. Client calls makeProxyRequest with action and params
 * 2. Request goes to API Gateway -> Lambda (opensearchproxy)
 * 3. Lambda signs request with IAM role and queries OpenSearch
 * 4. Results returned to client
 * 
 * Benefits:
 * - No CORS issues (Lambda handles authentication)
 * - Credentials stay server-side
 * - Standard AWS architecture pattern
 * 
 * Performance note:
 * Lambda cold starts can add latency (~1-2s). Consider:
 * 1. Provisioned concurrency for production
 * 2. Client-side caching for frequently accessed data
 * 3. Pre-warming Lambda on user login
 * 
 * Future improvements:
 * 1. Implement client-side caching for better performance
 * 2. Add retry logic for transient failures
 * 3. Add request/response interceptors for monitoring
 * 4. Consider direct OpenSearch access once CORS/SigV4 issues resolved
 */
