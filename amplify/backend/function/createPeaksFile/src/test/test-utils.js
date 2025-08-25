const assert = require('assert')
const { okResponse, escapeShellArg, getMax, parseS3Url } = require('../utils')

describe('utils', function () {
  describe('okResponse()', function () {
    it('should return correct response format', function () {
      const response = okResponse()
      assert.deepEqual(response, {
        statusCode: 200,
        body: '{"message": "ok"}'
      })
    })
  })

  describe('escapeShellArg()', function () {
    it('should escape single quotes in arguments', function () {
      const result = escapeShellArg("file's name.mp3")
      assert.equal(result, "'file'\"'\"'s name.mp3'")
    })

    it('should handle arguments without quotes', function () {
      const result = escapeShellArg('filename.mp3')
      assert.equal(result, "'filename.mp3'")
    })

    it('should handle empty string', function () {
      const result = escapeShellArg('')
      assert.equal(result, "''")
    })
  })

  describe('getMax()', function () {
    it('should find maximum value in array', function () {
      const result = getMax([1, 5, 3, 9, 2])
      assert.equal(result, 9)
    })

    it('should handle single element array', function () {
      const result = getMax([42])
      assert.equal(result, 42)
    })

    it('should handle negative numbers', function () {
      const result = getMax([-5, -1, -10, -3])
      assert.equal(result, -1)
    })

    it('should throw error for empty array', function () {
      assert.throws(() => getMax([]), /Array is empty or undefined/)
    })

    it('should throw error for null/undefined', function () {
      assert.throws(() => getMax(null), /Array is empty or undefined/)
      assert.throws(() => getMax(undefined), /Array is empty or undefined/)
    })
  })

  describe('parseS3Url()', function () {
    it('should parse valid S3 URL', function () {
      const url = 'https://test-bucket.s3.amazonaws.com/public/video.mp4'
      const result = parseS3Url(url)
      
      assert.deepEqual(result, {
        bucket: 'test-bucket',
        key: 'public/video.mp4',
        filename: 'video.mp4',
        filebits: ['video', 'mp4'],
        folder: 'public'
      })
    })

    it('should handle complex paths', function () {
      const url = 'https://my-bucket.s3.amazonaws.com/folder/subfolder/audio.mp3'
      const result = parseS3Url(url)
      
      assert.deepEqual(result, {
        bucket: 'my-bucket',
        key: 'folder/subfolder/audio.mp3',
        filename: 'audio.mp3',
        filebits: ['audio', 'mp3'],
        folder: 'folder/subfolder'
      })
    })

    it('should throw error for non-S3 URLs', function () {
      assert.throws(() => parseS3Url('https://example.com/file.mp3'), /URL unexpected/)
    })

    it('should throw error for URLs without extension', function () {
      assert.throws(() => parseS3Url('https://bucket.s3.amazonaws.com/file'), /Invalid S3 URL format/)
    })

    it('should throw error for invalid URL format', function () {
      assert.throws(() => parseS3Url('https://bucket.s3.amazonaws.com'), /Invalid S3 URL format/)
    })

    it('should throw error for null/undefined URL', function () {
      assert.throws(() => parseS3Url(null), /URL is required/)
      assert.throws(() => parseS3Url(undefined), /URL is required/)
    })
  })
})
