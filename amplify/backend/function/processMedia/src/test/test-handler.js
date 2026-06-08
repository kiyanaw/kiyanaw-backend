const mockRun = jest.fn()
const mockOkResponse = jest.fn().mockReturnValue({ statusCode: 200, body: '{"message": "ok"}' })

jest.mock('../lib/media', () => ({ run: mockRun }))
jest.mock('../utils', () => ({ okResponse: mockOkResponse }))

const handler = require('../index')

describe('handler', () => {
  beforeEach(() => jest.clearAllMocks())

  it('skips REMOVE events', async () => {
    const event = { Records: [{ eventName: 'REMOVE', dynamodb: { OldImage: { id: { S: 'abc' } } } }] }
    await handler.handler(event)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('skips records without PENDING status', async () => {
    const event = {
      Records: [{
        eventName: 'MODIFY',
        dynamodb: { NewImage: { id: { S: 'abc' }, status: { S: 'READY' }, originalKey: { S: 'originals/u/abc.mp4' }, mimeType: { S: 'video/mp4' } } }
      }]
    }
    await handler.handler(event)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('calls run for PENDING INSERT with video mime', async () => {
    mockRun.mockResolvedValue()
    const event = {
      Records: [{
        eventName: 'INSERT',
        dynamodb: { NewImage: { id: { S: 'abc' }, status: { S: 'PENDING' }, originalKey: { S: 'originals/u/abc.mp4' }, mimeType: { S: 'video/mp4' } } }
      }]
    }
    await handler.handler(event)
    expect(mockRun).toHaveBeenCalledWith({ id: 'abc', originalKey: 'originals/u/abc.mp4', mimeType: 'video/mp4' })
  })

  it('calls run for PENDING INSERT with audio mime', async () => {
    mockRun.mockResolvedValue()
    const event = {
      Records: [{
        eventName: 'INSERT',
        dynamodb: { NewImage: { id: { S: 'xyz' }, status: { S: 'PENDING' }, originalKey: { S: 'originals/u/xyz.mp3' }, mimeType: { S: 'audio/mpeg' } } }
      }]
    }
    await handler.handler(event)
    expect(mockRun).toHaveBeenCalledWith({ id: 'xyz', originalKey: 'originals/u/xyz.mp3', mimeType: 'audio/mpeg' })
  })

  it('continues processing subsequent records after a failure', async () => {
    mockRun
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce()
    const event = {
      Records: [
        { eventName: 'INSERT', dynamodb: { NewImage: { id: { S: 'a' }, status: { S: 'PENDING' }, originalKey: { S: 'originals/u/a.mp4' }, mimeType: { S: 'video/mp4' } } } },
        { eventName: 'INSERT', dynamodb: { NewImage: { id: { S: 'b' }, status: { S: 'PENDING' }, originalKey: { S: 'originals/u/b.mp3' }, mimeType: { S: 'audio/mpeg' } } } },
      ]
    }
    const result = await handler.handler(event)
    expect(mockRun).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ statusCode: 200, body: '{"message": "ok"}' })
  })

  it('skips records missing id or originalKey', async () => {
    const event = {
      Records: [{
        eventName: 'INSERT',
        dynamodb: { NewImage: { id: { S: 'abc' }, status: { S: 'PENDING' } } }
      }]
    }
    await handler.handler(event)
    expect(mockRun).not.toHaveBeenCalled()
  })
})
