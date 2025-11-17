/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

const { Client } = require('@opensearch-project/opensearch');
const AWS = require('aws-sdk');
const createAwsOpensearchConnector = require('aws-opensearch-connector');

// Create OpenSearch client with AWS IAM authentication
const client = new Client({
  ...createAwsOpensearchConnector(AWS.config),
  node: 'https://' + process.env.OPENSEARCH_ENDPOINT
});

// Get current environment
const getCurrentEnv = () => process.env.ENV || 'staging';

// Index names
const getKnownWordsIndex = () => `knownwords-${getCurrentEnv()}`;
const getIssuesIndex = () => `issues-${getCurrentEnv()}`;

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, params } = body;

    console.log(`Database action: ${action}`, params);

    let result;
    
    switch (action) {
      case 'getDatabaseStats':
        result = await getDatabaseStats(params?.lang);
        break;
      case 'searchDatabase':
        result = await searchDatabase(params?.query, params?.lang);
        break;
      case 'getLemmaDetails':
        result = await getLemmaDetails(params?.lemma, params?.lang);
        break;
      case 'getAttestations':
        result = await getAttestations(params?.lemma, params?.surface, params?.lang, params?.page, params?.limit);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result
      })
    };

  } catch (error) {
    console.error('Database proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// Database query functions
async function getDatabaseStats(lang) {
  const indexName = getKnownWordsIndex();
  
  // Build the query filter for language
  const langFilter = lang && lang !== 'all' ? { term: { lang } } : { match_all: {} };
  
  const searchBody = {
    size: 0,
    query: langFilter,
    aggs: {
      total_words: {
        cardinality: {
          field: 'lemma.keyword'
        }
      },
      total_transcriptions: {
        cardinality: {
          field: 'transcriptionId.keyword'
        }
      },
      word_types: {
        terms: {
          field: 'wordType.keyword',
          size: 10
        }
      },
      top_verbs: {
        filter: {
          terms: { 'wordType.keyword': ['V', 'VAI', 'VTI', 'VTA', 'VII'] }
        },
        aggs: {
          verbs: {
            terms: {
              field: 'lemma.keyword',
              size: 5
            }
          }
        }
      },
      top_nouns: {
        filter: {
          terms: { 'wordType.keyword': ['N', 'NA', 'NI'] }
        },
        aggs: {
          nouns: {
            terms: {
              field: 'lemma.keyword',
              size: 5
            }
          }
        }
      }
    }
  };
  
  const response = await client.search({
    index: indexName,
    body: searchBody
  });
  
  const aggs = response.body.aggregations;
  
  return {
    totalWords: aggs?.total_words?.value || 0,
    totalTranscriptions: aggs?.total_transcriptions?.value || 0,
    wordTypeDistribution: (aggs?.word_types?.buckets || []).map(bucket => ({
      wordType: bucket.key,
      count: bucket.doc_count
    })),
    topVerbs: (aggs?.top_verbs?.verbs?.buckets || []).map(bucket => ({
      lemma: bucket.key,
      count: bucket.doc_count
    })),
    topNouns: (aggs?.top_nouns?.nouns?.buckets || []).map(bucket => ({
      lemma: bucket.key,
      count: bucket.doc_count
    }))
  };
}

async function searchDatabase(query, lang) {
  if (!query?.trim()) {
    return [];
  }
  
  const indexName = getKnownWordsIndex();
  
  const filters = [];
  if (lang && lang !== 'all') {
    filters.push({ term: { lang } });
  }
  
  const searchBody = {
    size: 0,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: query.toLowerCase(),
              fields: ['lemma', 'surface'],
              type: 'phrase_prefix'
            }
          }
        ],
        filter: filters
      }
    },
    aggs: {
      lemmas: {
        terms: {
          field: 'lemma.keyword',
          size: 10
        },
        aggs: {
          word_type: {
            top_hits: {
              size: 1,
              _source: ['wordType']
            }
          }
        }
      }
    }
  };
  
  const response = await client.search({
    index: indexName,
    body: searchBody
  });
  
  const aggs = response.body.aggregations;
  
  return (aggs?.lemmas?.buckets || []).map(bucket => ({
    lemma: bucket.key,
    count: bucket.doc_count,
    wordType: bucket.word_type?.hits?.hits?.[0]?._source?.wordType || 'Unknown'
  }));
}

async function getLemmaDetails(lemma, lang) {
  const indexName = getKnownWordsIndex();
  
  const filters = [{ term: { 'lemma.keyword': lemma } }];
  if (lang && lang !== 'all') {
    filters.push({ term: { lang } });
  }
  
  const searchBody = {
    size: 0,
    query: {
      bool: {
        filter: filters
      }
    },
    aggs: {
      surface_forms: {
        terms: {
          field: 'surface.keyword',
          size: 100
        }
      },
      total_occurrences: {
        sum: {
          script: {
            source: "1"
          }
        }
      }
    }
  };
  
  const response = await client.search({
    index: indexName,
    body: searchBody
  });
  
  const aggs = response.body.aggregations;
  
  const surfaceForms = (aggs?.surface_forms?.buckets || []).map(bucket => ({
    surface: bucket.key,
    count: bucket.doc_count
  }));
  
  const totalOccurrences = aggs?.total_occurrences?.value || 0;
  const itwêwinaUrl = `https://itwewina.altlab.app/word/${encodeURIComponent(lemma)}/`;
  
  return {
    lemma,
    definition: undefined,
    itwêwinaUrl,
    surfaceForms,
    totalOccurrences
  };
}

async function getAttestations(lemma, surface, lang, page = 1, limit = 20) {
  const indexName = getKnownWordsIndex();
  
  const filters = [
    { term: { 'lemma.keyword': lemma } },
    { term: { 'surface.keyword': surface } }
  ];
  if (lang && lang !== 'all') {
    filters.push({ term: { lang } });
  }
  
  const searchBody = {
    size: limit,
    from: (page - 1) * limit,
    query: {
      bool: {
        filter: filters
      }
    },
    _source: [
      'transcriptionId',
      'transcriptionName', 
      'regionId',
      'regionText',
      'timestamp',
      'surface',
      'lemma'
    ],
    sort: [
      { 'transcriptionName.keyword': { order: 'asc' } },
      { 'timestamp': { order: 'asc' } }
    ]
  };
  
  const response = await client.search({
    index: indexName,
    body: searchBody
  });
  
  return (response.body.hits?.hits || []).map(hit => {
    const source = hit._source;
    return {
      transcriptionId: source.transcriptionId,
      transcriptionName: source.transcriptionName,
      regionId: source.regionId,
      regionText: source.regionText || '',
      timestamp: source.timestamp || '0:0',
      surface: source.surface,
      lemma: source.lemma
    };
  });
}