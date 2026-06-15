const mockUpdateMediaStatus = jest.fn()
const mockGetS3File = jest.fn()
const mockPutS3File = jest.fn()
const mockRunCommand = jest.fn()
const mockGenerateWaveform = jest.fn()
const mockProcessPeaksData = jest.fn()

jest.mock('../lib/dynamo', () => ({ updateMediaStatus: mockUpdateMediaStatus }))
jest.mock('../lib/s3', () => ({ getS3File: mockGetS3File, putS3File: mockPutS3File, efsPath: '/mnt/temp' }))
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
    callback(null, '5.0', '')
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

    // Final status READY with public/-prefixed keys
    const readyCall = mockUpdateMediaStatus.mock.calls.find(c => c[1] === 'READY')
    expect(readyCall).toBeTruthy()
    expect(readyCall[2].renditionKey).toBe('public/renditions/abc.mp3')
    expect(readyCall[2].peaksKey).toBe('public/peaks/abc.json')
    expect(readyCall[2].thumbnailKey).toBeUndefined()
  })

  it('branches into video path for video/mp4 mime type', async () => {
    await run({ id: 'xyz', originalKey: 'public/originals/xyz.mp4', mimeType: 'video/mp4' })

    // ffmpeg video transcode command used
    const transcodeCall = mockRunCommand.mock.calls.find(c => c[0].includes('libx264'))
    expect(transcodeCall).toBeTruthy()

    // Thumbnail generated for video
    const thumbCall = mockRunCommand.mock.calls.find(c => c[0].includes('-frames:v'))
    expect(thumbCall).toBeTruthy()

    // Final status READY with public/-prefixed keys
    const readyCall = mockUpdateMediaStatus.mock.calls.find(c => c[1] === 'READY')
    expect(readyCall).toBeTruthy()
    expect(readyCall[2].renditionKey).toBe('public/renditions/xyz.mp4')
    expect(readyCall[2].peaksKey).toBe('public/peaks/xyz.json')
    expect(readyCall[2].thumbnailKey).toBe('public/thumbnails/xyz.jpg')
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
})
