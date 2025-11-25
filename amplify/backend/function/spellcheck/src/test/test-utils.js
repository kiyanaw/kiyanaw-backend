const { parseRequestBody, errorResponse, successResponse, HEADERS } = require('../lib/utils')

describe('utils', () => {
  describe('parseRequestBody', () => {
    it('parses new format with languageCode and words', () => {
      const body = JSON.stringify({ languageCode: 'crk', words: ['itwêw', 'êkwa'] })
      const result = parseRequestBody(body)
      
      expect(result).toEqual({
        languageCode: 'crk',
        words: ['itwêw', 'êkwa']
      })
    })

    it('parses fallback format (array of words)', () => {
      const body = JSON.stringify(['itwêw', 'êkwa'])
      const result = parseRequestBody(body)
      
      expect(result).toEqual({
        languageCode: 'crk',
        words: ['itwêw', 'êkwa']
      })
    })

    it('returns null for invalid format', () => {
      expect(parseRequestBody(JSON.stringify({ words: ['test'] }))).toBeNull()
      expect(parseRequestBody(JSON.stringify({ languageCode: 'crk' }))).toBeNull()
      expect(parseRequestBody(JSON.stringify({}))).toBeNull()
    })

    it('returns null for null or undefined body', () => {
      expect(parseRequestBody(null)).toBeNull()
      expect(parseRequestBody(undefined)).toBeNull()
    })

    it('returns null for invalid JSON', () => {
      expect(parseRequestBody('invalid json')).toBeNull()
      expect(parseRequestBody('{invalid}')).toBeNull()
    })
  })

  describe('errorResponse', () => {
    it('creates error response with correct structure', () => {
      const response = errorResponse(400, 'Bad request')
      
      expect(response).toEqual({
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Bad request' })
      })
    })

    it('uses correct headers', () => {
      const response = errorResponse(500, 'Server error')
      expect(response.headers).toBe(HEADERS)
    })
  })

  describe('successResponse', () => {
    it('creates success response with correct structure', () => {
      const data = { result: 'success' }
      const response = successResponse(200, data)
      
      expect(response).toEqual({
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(data)
      })
    })

    it('uses correct headers', () => {
      const response = successResponse(200, {})
      expect(response.headers).toBe(HEADERS)
    })
  })

  describe('HEADERS', () => {
    it('defines CORS headers', () => {
      expect(HEADERS).toHaveProperty('Access-Control-Allow-Headers')
      expect(HEADERS).toHaveProperty('Access-Control-Allow-Origin')
      expect(HEADERS).toHaveProperty('Access-Control-Allow-Methods')
    })

    it('allows all origins and methods', () => {
      expect(HEADERS['Access-Control-Allow-Origin']).toBe('*')
      expect(HEADERS['Access-Control-Allow-Headers']).toBe('*')
      expect(HEADERS['Access-Control-Allow-Methods']).toContain('POST')
    })
  })
})

