import { post } from 'aws-amplify/api';
import type { 
  DatabaseStats, 
  LemmaDetails, 
  SurfaceForm, 
  Attestation, 
  SearchResult
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
 * Search the database for lemmas matching a query
 * @param query Search query string
 * @param lang Optional language filter
 * @returns Promise<SearchResult[]>
 */
export const searchDatabase = async (query: string, lang?: string): Promise<SearchResult[]> => {
  console.log(`🔎 Searching database for: "${query}"${lang ? ` (${lang})` : ''}`);
  
  if (!query.trim()) {
    return [];
  }
  
  try {
    const results = await makeProxyRequest('searchDatabase', { query, lang });
    console.log(`🔍 Search results for "${query}":`, results);
    return results;
  } catch (error) {
    console.error('❌ Error searching database:', error);
    throw new Error(`Failed to search database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * TODO: Production implementation notes
 * 
 * In production, these functions should:
 * 1. Call Lambda functions that query OpenSearch directly
 * 2. Use proper authentication (IAM roles, API Gateway)
 * 3. Handle pagination for large result sets
 * 4. Implement proper error handling and retries
 * 5. Cache results for better performance
 * 
 * Example Lambda function structure:
 * - GET /api/database/stats?lang=crk
 * - GET /api/database/lemma/{lemma}?lang=crk
 * - GET /api/database/lemma/{lemma}/surface-forms?lang=crk
 * - GET /api/database/attestations?lemma=X&surface=Y&lang=crk
 * - GET /api/database/search?q=query&lang=crk
 */
