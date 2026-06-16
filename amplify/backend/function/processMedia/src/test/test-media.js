const mockUpdateMediaStatus = jest.fn()
const mockGetS3FileSize = jest.fn()
const mockGetS3File = jest.fn()
const mockPutS3File = jest.fn()
const mockRunCommand = jest.fn()
const mockGenerateWaveform = jest.fn()
const mockProcessPeaksData = jest.fn()

jest.mock('../lib/dynamo', () => ({ updateMediaStatus: mockUpdateMediaStatus }))
jest.mock('../lib/s3', () => ({
  getS3FileSize: mockGetS3FileSize,
  getS3File: mockGetS3File,
  putS3File: mockPutS3File,
  efsPath: '/mnt/temp',
}))
jest.mock('../lib/audio', () => ({
  runCommand: mockRunCommand,
  generateWaveform: mockGenerateWaveform,
  processPeaksData: mockProcessPeaksData,
}))

// fs.existsSync and fs.readFileSync are stubbed so no real disk access needed
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('rendition-bytes')),
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({ size: 1024 * 1024 }), // 1 MB — below large-video threshold
  createWriteStream: jest.fn(),
  unlinkSync: jest.fn(),
}))

jest.mock('child_process', () => ({
  exec: jest.fn((cmd, optsOrCb, cb) => {
    const callback = typeof optsOrCb === 'function' ? optsOrCb : cb
    if (typeof cmd === 'string' && cmd.includes('-select_streams a')) {
      // ffprobe audio selection: single decodable AAC stream by default
      callback(null, JSON.stringify({ streams: [{ codec_name: 'aac' }] }), '')
    } else if (typeof cmd === 'string' && cmd.includes('-select_streams v')) {
      // ffprobe video-stream check: has a video stream by default
      callback(null, JSON.stringify({ streams: [{ codec_name: 'h264' }] }), '')
    } else {
      callback(null, '5.0', '') // ffprobe duration
    }
  }),
}))

process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME = 'test-bucket'
process.env.API_KIYANAW_MEDIATABLE_NAME = 'MediaTable'
process.env.REGION = 'us-east-1'

const { run } = require('../lib/media')

describe('media.run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateMediaStatus.mockResolvedValue({})
    mockGetS3FileSize.mockResolvedValue(1024 * 1024) // 1 MB — well under the download cap
    mockGetS3File.mockResolvedValue({})
    mockRunCommand.mockResolvedValue()
    mockGenerateWaveform.mockResolvedValue('/mnt/temp/abc-rendition.mp3.json')
    mockProcessPeaksData.mockResolvedValue({ data: [0.1, 0.2] })
    mockPutS3File.mockResolvedValue({})
  })

  it('branches into audio path for audio/mpeg mime type', async () => {
    await run({ id: 'abc', originalKey: 'public/originals/abc.mp3', mimeType: 'audio/mpeg' })

    // Status set to PROCESSING with condition
    expect(mockUpdateMediaStatus).toHaveBeenCalledWith('abc', 'PROCESSING', { conditionStatus: 'PENDING' })

    // ffmpeg audio transcode command used (not video scale)
    const transcodeCall = mockRunCommand.mock.calls.find(c => c[0].includes('libmp3lame'))
    expect(transcodeCall).toBeTruthy()

    // No thumbnail for audio
    const thumbCall = mockRunCommand.mock.calls.find(c => c[0].includes('-frames:v'))
    expect(thumbCall).toBeUndefined()

    // Final status READY with public/-prefixed keys; audioOnly false (was never a video)
    const readyCall = mockUpdateMediaStatus.mock.calls.find(c => c[1] === 'READY')
    expect(readyCall).toBeTruthy()
    expect(readyCall[2].renditionKey).toBe('public/renditions/abc.mp3')
    expect(readyCall[2].peaksKey).toBe('public/peaks/abc.json')
    expect(readyCall[2].thumbnailKey).toBeUndefined()
    expect(readyCall[2].audioOnly).toBe(false)
  })

  it('branches into video path for video/mp4 mime type', async () => {
    await run({ id: 'xyz', originalKey: 'public/originals/xyz.mp4', mimeType: 'video/mp4' })

    // ffmpeg video transcode command used, with a muxing queue guard against
    // "Too many packets buffered" on erratic input timestamps
    const transcodeCall = mockRunCommand.mock.calls.find(c => c[0].includes('libx264'))
    expect(transcodeCall).toBeTruthy()
    expect(transcodeCall[0]).toContain('-max_muxing_queue_size')

    // Thumbnail generated for video
    const thumbCall = mockRunCommand.mock.calls.find(c => c[0].includes('-frames:v'))
    expect(thumbCall).toBeTruthy()

    // Final status READY with public/-prefixed keys; audioOnly false (full video rendition)
    const readyCall = mockUpdateMediaStatus.mock.calls.find(c => c[1] === 'READY')
    expect(readyCall).toBeTruthy()
    expect(readyCall[2].renditionKey).toBe('public/renditions/xyz.mp4')
    expect(readyCall[2].peaksKey).toBe('public/peaks/xyz.json')
    expect(readyCall[2].thumbnailKey).toBe('public/thumbnails/xyz.jpg')
    expect(readyCall[2].audioOnly).toBe(false)
  })

  it('sets audioOnly true for a large video transcoded to audio', async () => {
    const { statSync } = require('fs')
    statSync.mockReturnValueOnce({ size: 100 * 1024 * 1024 }) // 100 MB — above the 75 MB threshold

    await run({ id: 'big', originalKey: 'public/originals/big.mp4', mimeType: 'video/mp4' })

    // Audio extraction command used, not video transcode
    const transcodeCall = mockRunCommand.mock.calls.find(c => c[0].includes('libmp3lame'))
    expect(transcodeCall).toBeTruthy()
    const videoCall = mockRunCommand.mock.calls.find(c => c[0].includes('libx264'))
    expect(videoCall).toBeUndefined()

    // No thumbnail
    const thumbCall = mockRunCommand.mock.calls.find(c => c[0].includes('-frames:v'))
    expect(thumbCall).toBeUndefined()

    // audioOnly saved as true
    const readyCall = mockUpdateMediaStatus.mock.calls.find(c => c[1] === 'READY')
    expect(readyCall).toBeTruthy()
    expect(readyCall[2].renditionKey).toBe('public/renditions/big.mp3')
    expect(readyCall[2].audioOnly).toBe(true)
  })

  it('falls back to extension when mime is application/octet-stream', async () => {
    await run({ id: 'abc', originalKey: 'public/originals/u/abc.mp4', mimeType: 'application/octet-stream' })
    const transcodeCall = mockRunCommand.mock.calls.find(c => c[0].includes('libx264'))
    expect(transcodeCall).toBeTruthy()
  })

  it('skips via ConditionalCheckFailedException (dedupe)', async () => {
    const err = new Error('condition failed')
    err.name = 'ConditionalCheckFailedException'
    mockUpdateMediaStatus.mockRejectedValueOnce(err)

    await run({ id: 'abc', originalKey: 'public/originals/abc.mp3', mimeType: 'audio/mpeg' })

    // Should not proceed to download after dedupe skip
    expect(mockGetS3File).not.toHaveBeenCalled()
  })

  it('sets ERROR status on processing failure', async () => {
    mockGetS3File.mockRejectedValueOnce(new Error('S3 error'))

    await expect(run({ id: 'abc', originalKey: 'public/originals/abc.mp3', mimeType: 'audio/mpeg' })).rejects.toThrow('S3 error')

    const errorCall = mockUpdateMediaStatus.mock.calls.find(c => c[1] === 'ERROR')
    expect(errorCall).toBeTruthy()
  })

  it('rejects without downloading when the S3 object exceeds the 1 GB download cap', async () => {
    mockGetS3FileSize.mockResolvedValueOnce(2 * 1024 * 1024 * 1024) // 2 GB

    await expect(
      run({ id: 'huge', originalKey: 'public/originals/huge.mp4', mimeType: 'video/mp4' })
    ).rejects.toThrow(/exceeding the 1\.0 GB download cap/)

    expect(mockGetS3File).not.toHaveBeenCalled()
    const errorCall = mockUpdateMediaStatus.mock.calls.find(c => c[1] === 'ERROR')
    expect(errorCall).toBeTruthy()
  })

  it('falls back to audio when a video-tagged file has no actual video stream', async () => {
    // mp4 container that's actually an audio-only export (voice memo, audio-only
    // DaVinci Resolve render, etc.) — audio probe first, then video probe finds nothing
    const { exec } = require('child_process')
    exec
      .mockImplementationOnce((cmd, optsOrCb, cb) => {
        const callback = typeof optsOrCb === 'function' ? optsOrCb : cb
        callback(null, JSON.stringify({ streams: [{ codec_name: 'aac' }] }), '')
      })
      .mockImplementationOnce((cmd, optsOrCb, cb) => {
        const callback = typeof optsOrCb === 'function' ? optsOrCb : cb
        callback(null, JSON.stringify({ streams: [] }), '')
      })

    await run({ id: 'voiceclip', originalKey: 'public/originals/voiceclip.mp4', mimeType: 'video/mp4' })

    const videoCall = mockRunCommand.mock.calls.find(c => c[0].includes('libx264'))
    expect(videoCall).toBeUndefined()
    const audioCall = mockRunCommand.mock.calls.find(c => c[0].includes('libmp3lame'))
    expect(audioCall).toBeTruthy()
    expect(audioCall[0]).not.toContain('-map 0:v:0')

    // No thumbnail — there's no video frame to grab
    const thumbCall = mockRunCommand.mock.calls.find(c => c[0].includes('-frames:v'))
    expect(thumbCall).toBeUndefined()

    const readyCall = mockUpdateMediaStatus.mock.calls.find(c => c[1] === 'READY')
    expect(readyCall).toBeTruthy()
    expect(readyCall[2].renditionKey).toBe('public/renditions/voiceclip.mp3')
    expect(readyCall[2].thumbnailKey).toBeUndefined()
    expect(readyCall[2].audioOnly).toBe(true)
  })

  it('skips undecodable apac track and maps the next decodable audio stream', async () => {
    // Simulate iPhone MOV with apac (spatial audio) first, AAC second
    const { exec } = require('child_process')
    exec.mockImplementationOnce((cmd, optsOrCb, cb) => {
      const callback = typeof optsOrCb === 'function' ? optsOrCb : cb
      callback(null, JSON.stringify({ streams: [{ codec_name: 'apac' }, { codec_name: 'aac' }] }), '')
    })

    await run({ id: 'iphone', originalKey: 'public/originals/iphone.mov', mimeType: 'video/quicktime' })

    const transcodeCall = mockRunCommand.mock.calls.find(c => c[0].includes('libx264'))
    expect(transcodeCall).toBeTruthy()
    // apac is at audio-relative index 0; AAC is at index 1 — must map to a:1
    expect(transcodeCall[0]).toContain('-map 0:a:1')
    expect(transcodeCall[0]).not.toContain('-map 0:a:0')
  })
})
