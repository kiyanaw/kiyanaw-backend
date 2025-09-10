const assert = require('assert')

// Mock child_process
const mockExec = jest.fn()

// Mock fs
const mockFs = {
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}

// Mock the modules
jest.mock('child_process', () => ({
  exec: mockExec
}))

jest.mock('fs', () => mockFs)

const audio = require('../lib/audio')

describe('audio utilities', function () {
  beforeEach(function () {
    // Reset mocks
    mockExec.mockClear()
    mockFs.readFileSync.mockClear()
    mockFs.existsSync.mockClear()
    
    // Setup default mock behaviors
    mockExec.mockImplementation((command, options, callback) => {
      callback(null, 'stdout', 'stderr')
    })
    
    mockFs.readFileSync.mockReturnValue('{"data": [1, 2, 3, 4, 5]}')
    mockFs.existsSync.mockReturnValue(true)
  })

  describe('runCommand()', function () {
    it('should execute command successfully', async function () {
      await audio.runCommand('test command')
      
      assert.ok(mockExec.mock.calls.length > 0)
      assert.equal(mockExec.mock.calls[0][0], 'test command')
      assert.deepEqual(mockExec.mock.calls[0][1], { maxBuffer: 1024 * 500 })
    })

    it('should handle command errors', async function () {
      mockExec.mockImplementation((command, options, callback) => {
        callback(new Error('Command failed'), 'stdout', 'stderr')
      })
      
      try {
        await audio.runCommand('test command')
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.equal(error.message, 'Command failed')
      }
    })
  })

  describe('extractAudioFromVideo()', function () {
    it('should extract audio from video file', async function () {
      const result = await audio.extractAudioFromVideo('/input/video.mp4', '/output/audio.mp3')
      
      assert.ok(mockExec.mock.calls.length > 0)
      assert.equal(mockExec.mock.calls[0][0], "ffmpeg -i '/input/video.mp4' '/output/audio.mp3'")
      assert.equal(result, '/output/audio.mp3')
    })
  })

  describe('generateWaveform()', function () {
    it('should generate waveform data', async function () {
      const result = await audio.generateWaveform('/path/audio.mp3')
      
      assert.equal(mockExec.mock.calls.length, 2)
      
      // First call - generate dat file
      assert.equal(mockExec.mock.calls[0][0], "audiowaveform -i '/path/audio.mp3' -o '/path/audio.mp3.dat' --pixels-per-second 20")
      
      // Second call - convert to JSON
      assert.equal(mockExec.mock.calls[1][0], "audiowaveform -i '/path/audio.mp3.dat' -o '/path/audio.mp3.json'")
      
      assert.equal(result, '/path/audio.mp3.json')
    })
  })

  describe('processPeaksData()', function () {
    it('should process peaks data correctly', async function () {
      mockFs.readFileSync.mockReturnValue('{"data": [10, 20, 30, 40, 50]}')
      
      const result = await audio.processPeaksData('/path/peaks.json')
      
      assert.ok(mockFs.readFileSync.mock.calls.some(call => call[0] === '/path/peaks.json'))
      assert.deepEqual(result.data, [0.2, 0.4, 0.6, 0.8, 1.0])
    })

    it('should handle empty data array', async function () {
      mockFs.readFileSync.mockReturnValue('{"data": []}')
      
      try {
        await audio.processPeaksData('/path/peaks.json')
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.equal(error.message, 'Array is empty or undefined')
      }
    })
  })

  describe('cleanupFiles()', function () {
    it('should cleanup existing files', async function () {
      await audio.cleanupFiles(['/file1.mp3', '/file2.dat', '/file3.json'])
      
      assert.equal(mockExec.mock.calls.length, 3)
      assert.equal(mockExec.mock.calls[0][0], "rm -rf '/file1.mp3'")
      assert.equal(mockExec.mock.calls[1][0], "rm -rf '/file2.dat'")
      assert.equal(mockExec.mock.calls[2][0], "rm -rf '/file3.json'")
    })

    it('should skip non-existent files', async function () {
      mockFs.existsSync.mockReturnValue(false)
      
      await audio.cleanupFiles(['/file1.mp3', '/file2.dat'])
      
      assert.equal(mockExec.mock.calls.length, 0)
    })

    it('should handle mixed existing and non-existing files', async function () {
      mockFs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
      
      await audio.cleanupFiles(['/file1.mp3', '/file2.dat'])
      
      assert.equal(mockExec.mock.calls.length, 1)
      assert.equal(mockExec.mock.calls[0][0], "rm -rf '/file1.mp3'")
    })
  })

  describe('isVideoFormat()', function () {
    it('should identify video formats', function () {
      assert.equal(audio.isVideoFormat('mp4'), true)
      assert.equal(audio.isVideoFormat('m4v'), true)
      assert.equal(audio.isVideoFormat('m4a'), true)
      assert.equal(audio.isVideoFormat('MP4'), true)
      assert.equal(audio.isVideoFormat('M4V'), true)
      assert.equal(audio.isVideoFormat('M4A'), true)
    })

    it('should identify non-video formats', function () {
      assert.equal(audio.isVideoFormat('mp3'), false)
      assert.equal(audio.isVideoFormat('wav'), false)
      assert.equal(audio.isVideoFormat('avi'), false)
    })
  })
})
