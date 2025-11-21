/**
 * Integration tests for search.js
 * Tests the complete flow of indexing region analysis with language-specific processing
 */

const { indexRegionAnalysis, clearKnownWordsForRegion } = require('../lib/search')

// Mock the OpenSearch client
jest.mock('../lib/es', () => ({
  client: {
    update: jest.fn(),
    deleteByQuery: jest.fn(),
    search: jest.fn(),
    bulk: jest.fn(),
  }
}))

const { client } = require('../lib/es')

describe('search.js integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default successful response for OpenSearch
    client.update.mockResolvedValue({
      body: {
        _shards: { successful: 1 },
        result: 'updated'
      },
      statusCode: 200
    })
    client.deleteByQuery.mockResolvedValue({
      body: { deleted: 5 }
    })
    client.search.mockResolvedValue({
      body: {
        hits: {
          hits: []
        }
      }
    })
    client.bulk.mockResolvedValue({
      body: {
        items: []
      }
    })
  })

  describe('indexRegionAnalysis', () => {
    it('should skip indexing if transcription has no language set', async () => {
      const region = {
        id: 'region-123',
        transcriptionId: 'trans-123',
        regionAnalysis: [
          { word: 'êkây', analysis: 'êkây+Ipc' }
        ],
        regionText: 'êkây',
        start: 0,
        end: 1
      }

      const transcription = {
        title: 'Test Transcription',
        lang: null // No language set
      }

      await indexRegionAnalysis(region, transcription)

      // Should not call OpenSearch
      expect(client.update).not.toHaveBeenCalled()
    })

    it('should skip indexing if regionAnalysis is empty', async () => {
      const region = {
        id: 'region-123',
        transcriptionId: 'trans-123',
        regionAnalysis: [],
        regionText: '',
        start: 0,
        end: 1
      }

      const transcription = {
        title: 'Test Transcription',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      expect(client.update).not.toHaveBeenCalled()
    })

    it('should skip indexing if language processor is not available', async () => {
      const region = {
        id: 'region-123',
        transcriptionId: 'trans-123',
        regionAnalysis: [
          { word: 'test', analysis: 'test+N' }
        ],
        regionText: 'test',
        start: 0,
        end: 1
      }

      const transcription = {
        title: 'Test Transcription',
        lang: 'xyz' // Unsupported language
      }

      await indexRegionAnalysis(region, transcription)

      expect(client.update).not.toHaveBeenCalled()
    })

    it('should index CRK particles correctly', async () => {
      const region = {
        id: 'region-123',
        transcriptionId: 'trans-123',
        regionAnalysis: [
          { word: 'êkây', analysis: 'êkây+Ipc' },
          { word: 'âhâ', analysis: 'âhâ+Ipc+Interj' }
        ],
        regionText: 'êkây âhâ',
        start: 0,
        end: 2.5
      }

      const transcription = {
        title: 'Test Transcription',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      expect(client.update).toHaveBeenCalledTimes(2)

      // Check first word
      expect(client.update).toHaveBeenCalledWith({
        index: 'knownwords-undefined',
        id: 'region-123-êkây',
        body: {
          doc: {
            lang: 'crk',
            lemma: 'êkây',
            surface: 'êkây',
            transcriptionId: 'trans-123',
            regionId: 'region-123',
            regionText: 'êkây âhâ',
            wordType: 'Ipc',
            wordClass: 'IPC',
            transcriptionName: 'Test Transcription',
            timestamp: '0:2.5'
          },
          doc_as_upsert: true
        }
      })

      // Check second word
      expect(client.update).toHaveBeenCalledWith({
        index: 'knownwords-undefined',
        id: 'region-123-âhâ',
        body: {
          doc: {
            lang: 'crk',
            lemma: 'âhâ',
            surface: 'âhâ',
            transcriptionId: 'trans-123',
            regionId: 'region-123',
            regionText: 'êkây âhâ',
            wordType: 'Ipc',
            wordClass: 'IPC',
            transcriptionName: 'Test Transcription',
            timestamp: '0:2.5'
          },
          doc_as_upsert: true
        }
      })
    })

    it('should index CRK nouns correctly', async () => {
      const region = {
        id: 'region-456',
        transcriptionId: 'trans-456',
        regionAnalysis: [
          { word: 'nêhiyaw', analysis: 'nêhiyaw+N+A+Sg' },
          { word: 'mîkiwâhp', analysis: 'mîkiwâhp+N+I+Sg' }
        ],
        regionText: 'nêhiyaw mîkiwâhp',
        start: 5.0,
        end: 8.5
      }

      const transcription = {
        title: 'Noun Test',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      expect(client.update).toHaveBeenCalledTimes(2)

      // Check animate noun
      const firstCall = client.update.mock.calls[0][0]
      expect(firstCall.body.doc).toMatchObject({
        lemma: 'nêhiyaw',
        surface: 'nêhiyaw',
        wordType: 'N',
        wordClass: 'NA'
      })

      // Check inanimate noun
      const secondCall = client.update.mock.calls[1][0]
      expect(secondCall.body.doc).toMatchObject({
        lemma: 'mîkiwâhp',
        surface: 'mîkiwâhp',
        wordType: 'N',
        wordClass: 'NI'
      })
    })

    it('should index CRK verbs with preverbs correctly', async () => {
      const region = {
        id: 'region-789',
        transcriptionId: 'trans-789',
        regionAnalysis: [
          { word: 'ati-ohpikitâw', analysis: 'PV/ati+ohpikihtâw+V+TI+Ind+3Sg' },
          { word: 'ê-awâsîwit', analysis: 'PV/e+awasêwêw+V+AI+Cnj+3Sg' }
        ],
        regionText: 'ati-ohpikitâw ê-awâsîwit',
        start: 10.0,
        end: 14.0
      }

      const transcription = {
        title: 'Verb Test',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      expect(client.update).toHaveBeenCalledTimes(2)

      // Check VTI verb
      const firstCall = client.update.mock.calls[0][0]
      expect(firstCall.body.doc).toMatchObject({
        lemma: 'ohpikihtâw',
        wordType: 'V',
        wordClass: 'VTI'
      })

      // Check VAI verb
      const secondCall = client.update.mock.calls[1][0]
      expect(secondCall.body.doc).toMatchObject({
        lemma: 'awasêwêw',
        wordType: 'V',
        wordClass: 'VAI'
      })
    })

    it('should apply character processing (macron to circumflex)', async () => {
      const region = {
        id: 'region-111',
        transcriptionId: 'trans-111',
        regionAnalysis: [
          { word: 'nēhiyāw', analysis: 'nêhiyaw+N+A+Sg' } // macrons in input
        ],
        regionText: 'nēhiyāw',
        start: 0,
        end: 1
      }

      const transcription = {
        title: 'Character Processing Test',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      expect(client.update).toHaveBeenCalledTimes(1)

      // Should convert macrons to circumflex
      const call = client.update.mock.calls[0][0]
      expect(call.body.doc.surface).toBe('nêhiyâw')
      expect(call.body.doc.regionText).toBe('nêhiyâw')
    })

    it('should strip punctuation from words', async () => {
      const region = {
        id: 'region-222',
        transcriptionId: 'trans-222',
        regionAnalysis: [
          { word: 'êkây,', analysis: 'êkây+Ipc' },
          { word: 'nêhiyaw.', analysis: 'nêhiyaw+N+A+Sg' }
        ],
        regionText: 'êkây, nêhiyaw.',
        start: 0,
        end: 2
      }

      const transcription = {
        title: 'Punctuation Test',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      expect(client.update).toHaveBeenCalledTimes(2)

      // Check punctuation is stripped
      expect(client.update.mock.calls[0][0].body.doc.surface).toBe('êkây')
      expect(client.update.mock.calls[1][0].body.doc.surface).toBe('nêhiyaw')
    })

    it('should skip words with missing analysis', async () => {
      const region = {
        id: 'region-333',
        transcriptionId: 'trans-333',
        regionAnalysis: [
          { word: 'êkây', analysis: 'êkây+Ipc' },
          { word: 'test', analysis: null }, // Missing analysis
          { word: 'nêhiyaw', analysis: 'nêhiyaw+N+A+Sg' }
        ],
        regionText: 'êkây test nêhiyaw',
        start: 0,
        end: 3
      }

      const transcription = {
        title: 'Missing Analysis Test',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      // Should only index 2 words (skipping the one with no analysis)
      expect(client.update).toHaveBeenCalledTimes(2)
      expect(client.update.mock.calls[0][0].body.doc.lemma).toBe('êkây')
      expect(client.update.mock.calls[1][0].body.doc.lemma).toBe('nêhiyaw')
    })

    it('should skip words that become empty after processing', async () => {
      const region = {
        id: 'region-444',
        transcriptionId: 'trans-444',
        regionAnalysis: [
          { word: 'êkây', analysis: 'êkây+Ipc' },
          { word: '...', analysis: 'unknown+N' }, // Will be empty after punctuation removal
          { word: 'nêhiyaw', analysis: 'nêhiyaw+N+A+Sg' }
        ],
        regionText: 'êkây ... nêhiyaw',
        start: 0,
        end: 3
      }

      const transcription = {
        title: 'Empty Word Test',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      // Should only index 2 words (skipping the punctuation-only word)
      expect(client.update).toHaveBeenCalledTimes(2)
    })

    it('should handle complex analysis strings with multiple preverbs', async () => {
      const region = {
        id: 'region-555',
        transcriptionId: 'trans-555',
        regionAnalysis: [
          { 
            word: 'ê-kî-nîhtâ-kâsôcik', 
            analysis: 'PV/e+PV/ki+PV/nihta+kâsôw+V+AI+Cnj+3Pl' 
          }
        ],
        regionText: 'ê-kî-nîhtâ-kâsôcik',
        start: 0,
        end: 2
      }

      const transcription = {
        title: 'Complex Analysis Test',
        lang: 'crk'
      }

      await indexRegionAnalysis(region, transcription)

      expect(client.update).toHaveBeenCalledTimes(1)

      // Should extract the verb stem correctly
      const call = client.update.mock.calls[0][0]
      expect(call.body.doc).toMatchObject({
        lemma: 'kâsôw',
        wordType: 'V',
        wordClass: 'VAI'
      })
    })

    it('should handle OpenSearch errors gracefully', async () => {
      const region = {
        id: 'region-666',
        transcriptionId: 'trans-666',
        regionAnalysis: [
          { word: 'êkây', analysis: 'êkây+Ipc' },
          { word: 'nêhiyaw', analysis: 'nêhiyaw+N+A+Sg' }
        ],
        regionText: 'êkây nêhiyaw',
        start: 0,
        end: 2
      }

      const transcription = {
        title: 'Error Test',
        lang: 'crk'
      }

      // Make first call fail
      client.update
        .mockRejectedValueOnce(new Error('OpenSearch connection failed'))
        .mockResolvedValueOnce({
          body: { _shards: { successful: 1 } },
          statusCode: 200
        })

      await indexRegionAnalysis(region, transcription)

      // Should have attempted both, one failed, one succeeded
      expect(client.update).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearKnownWordsForRegion', () => {
    it('should clear words for a region', async () => {
      // Mock search to return some document IDs
      client.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [
              { _id: 'region-123-word1' },
              { _id: 'region-123-word2' }
            ]
          }
        }
      })

      // Mock bulk delete
      client.bulk.mockResolvedValueOnce({
        body: {
          items: [
            { delete: { status: 200 } },
            { delete: { status: 200 } }
          ]
        }
      })

      await clearKnownWordsForRegion('region-123')

      // Should have searched for documents
      expect(client.search).toHaveBeenCalledWith({
        index: 'knownwords-undefined',
        body: {
          query: {
            term: { regionId: 'region-123' }
          },
          _source: false,
          size: 1000
        }
      })

      // Should have deleted via bulk
      expect(client.bulk).toHaveBeenCalledWith({
        body: [
          { delete: { _index: 'knownwords-undefined', _id: 'region-123-word1' } },
          { delete: { _index: 'knownwords-undefined', _id: 'region-123-word2' } }
        ],
        refresh: false
      })
    })

    it('should throw error for invalid regionId', async () => {
      await expect(clearKnownWordsForRegion(null)).rejects.toThrow('Invalid regionId')
      await expect(clearKnownWordsForRegion('')).rejects.toThrow('Invalid regionId')
      await expect(clearKnownWordsForRegion(123)).rejects.toThrow('Invalid regionId')
    })

    it('should handle index not found gracefully', async () => {
      client.search.mockRejectedValueOnce({
        meta: {
          statusCode: 404,
          body: {
            error: {
              type: 'index_not_found_exception'
            }
          }
        }
      })

      const result = await clearKnownWordsForRegion('region-123')

      expect(result).toEqual({ deleted: 0 })
    })
  })
})

