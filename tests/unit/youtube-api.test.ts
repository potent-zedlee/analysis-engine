/**
 * Unit Tests for YouTube API Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { YouTubeAPIClient, YouTubeAPIError } from '../../lib/youtube-api'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Video ID Extraction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('YouTubeAPIClient - Video ID Extraction', () => {
  let client: YouTubeAPIClient

  beforeEach(() => {
    client = new YouTubeAPIClient({ apiKey: 'test-api-key' })
  })

  it('should extract video ID from youtube.com/watch URL', () => {
    const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ'
    expect(client.extractVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it('should extract video ID from youtu.be URL', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ'
    expect(client.extractVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it('should extract video ID from youtube.com/embed URL', () => {
    const url = 'https://youtube.com/embed/dQw4w9WgXcQ'
    expect(client.extractVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it('should extract video ID from youtube.com/v URL', () => {
    const url = 'https://youtube.com/v/dQw4w9WgXcQ'
    expect(client.extractVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it('should extract video ID from m.youtube.com URL', () => {
    const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ'
    expect(client.extractVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it('should extract video ID with additional URL parameters', () => {
    const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ&t=120s&list=PLxyz'
    expect(client.extractVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it('should return null for invalid YouTube URL', () => {
    const url = 'https://not-youtube.com/video/123'
    expect(client.extractVideoId(url)).toBeNull()
  })

  it('should return null for malformed YouTube URL', () => {
    const url = 'https://youtube.com/watch?video=invalid'
    expect(client.extractVideoId(url)).toBeNull()
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: URL Validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('YouTubeAPIClient - URL Validation', () => {
  let client: YouTubeAPIClient

  beforeEach(() => {
    client = new YouTubeAPIClient({ apiKey: 'test-api-key' })
  })

  it('should validate YouTube URLs correctly', () => {
    expect(client.isYouTubeURL('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    expect(client.isYouTubeURL('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    expect(client.isYouTubeURL('https://not-youtube.com/video')).toBe(false)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: API Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('YouTubeAPIClient - Configuration', () => {
  it('should initialize with API key', () => {
    const client = new YouTubeAPIClient({ apiKey: 'my-api-key' })
    expect(client).toBeInstanceOf(YouTubeAPIClient)
  })

  it('should throw error if API key is missing', () => {
    expect(() => {
      new YouTubeAPIClient({ apiKey: '' })
    }).toThrow('YouTube API key is required')
  })

  it('should use default timeout of 10 seconds', () => {
    const client = new YouTubeAPIClient({ apiKey: 'test-key' })
    // @ts-ignore - accessing private property for testing
    expect(client.timeout).toBe(10000)
  })

  it('should accept custom timeout', () => {
    const client = new YouTubeAPIClient({
      apiKey: 'test-key',
      timeout: 5000
    })
    // @ts-ignore - accessing private property for testing
    expect(client.timeout).toBe(5000)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Video Metadata Fetching (Mocked)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('YouTubeAPIClient - Metadata Fetching', () => {
  let client: YouTubeAPIClient

  beforeEach(() => {
    client = new YouTubeAPIClient({ apiKey: 'test-api-key' })
    vi.clearAllMocks()
  })

  it('should fetch video metadata successfully', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: 'dQw4w9WgXcQ',
            snippet: {
              title: 'Triton Poker Cyprus 2024 - Day 3 Final Table',
              description: 'Watch the high stakes action from Triton Poker...',
              channelTitle: 'Triton Poker',
              channelId: 'UC123',
              tags: ['poker', 'triton', 'high-stakes'],
              publishedAt: '2024-10-01T00:00:00Z',
              thumbnails: {
                high: {
                  url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                },
              },
            },
          },
        ],
      }),
    })

    const metadata = await client.getVideoMetadata(
      'https://youtube.com/watch?v=dQw4w9WgXcQ'
    )

    expect(metadata.videoId).toBe('dQw4w9WgXcQ')
    expect(metadata.title).toBe('Triton Poker Cyprus 2024 - Day 3 Final Table')
    expect(metadata.description).toContain('Triton Poker')
    expect(metadata.channelTitle).toBe('Triton Poker')
    expect(metadata.channelId).toBe('UC123')
    expect(metadata.tags).toEqual(['poker', 'triton', 'high-stakes'])
    expect(metadata.publishedAt).toBe('2024-10-01T00:00:00Z')
    expect(metadata.thumbnail).toContain('hqdefault.jpg')
  })

  it('should throw error for invalid YouTube URL', async () => {
    await expect(
      client.getVideoMetadata('https://not-youtube.com/video')
    ).rejects.toThrow('Invalid YouTube URL')
  })

  it('should throw error if video not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [], // Empty items array
      }),
    })

    await expect(
      client.getVideoMetadata('https://youtube.com/watch?v=notfoundxxx')
    ).rejects.toThrow(YouTubeAPIError)
  })

  it('should throw error on API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({
        error: {
          message: 'API key invalid',
        },
      }),
    })

    await expect(
      client.getVideoMetadata('https://youtube.com/watch?v=dQw4w9WgXcQ')
    ).rejects.toThrow('YouTube API error: 403 - API key invalid')
  })

  it('should throw timeout error', async () => {
    const client = new YouTubeAPIClient({
      apiKey: 'test-key',
      timeout: 100 // 100ms timeout
    })

    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const error = new Error('AbortError')
          error.name = 'AbortError'
          reject(error)
        }, 150) // Simulate abort after 150ms
      })
    })

    await expect(
      client.getVideoMetadata('https://youtube.com/watch?v=dQw4w9WgXcQ')
    ).rejects.toThrow('YouTube API request timeout')
  })

  it('should handle missing optional fields gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'abc12345678',
            snippet: {
              title: 'Test Video',
              channelTitle: 'Test Channel',
              channelId: 'UC123456789',
              // description, tags, thumbnails missing
            },
          },
        ],
      }),
    })

    const metadata = await client.getVideoMetadata(
      'https://youtube.com/watch?v=abc12345678'
    )

    expect(metadata.title).toBe('Test Video')
    expect(metadata.description).toBe('')
    expect(metadata.tags).toEqual([])
    expect(metadata.thumbnail).toBe('')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Batch Metadata Fetching
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('YouTubeAPIClient - Batch Metadata', () => {
  let client: YouTubeAPIClient

  beforeEach(() => {
    client = new YouTubeAPIClient({ apiKey: 'test-api-key' })
    vi.clearAllMocks()
  })

  it('should fetch multiple videos metadata', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'video1abcde',
            snippet: {
              title: 'Video 1',
              description: 'Description 1',
              channelTitle: 'Channel 1',
              channelId: 'UC1',
              tags: [],
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: {},
            },
          },
          {
            id: 'video2fghij',
            snippet: {
              title: 'Video 2',
              description: 'Description 2',
              channelTitle: 'Channel 2',
              channelId: 'UC2',
              tags: [],
              publishedAt: '2024-01-02T00:00:00Z',
              thumbnails: {},
            },
          },
        ],
      }),
    })

    const metadata = await client.getMultipleVideoMetadata([
      'https://youtube.com/watch?v=video1abcde',
      'https://youtube.com/watch?v=video2fghij',
    ])

    expect(metadata).toHaveLength(2)
    expect(metadata[0].videoId).toBe('video1abcde')
    expect(metadata[1].videoId).toBe('video2fghij')
  })

  it('should return empty array for empty input', async () => {
    const metadata = await client.getMultipleVideoMetadata([])
    expect(metadata).toEqual([])
  })

  it('should throw error for more than 50 videos', async () => {
    const urls = Array.from({ length: 51 }, (_, i) =>
      `https://youtube.com/watch?v=video${i}`
    )

    await expect(
      client.getMultipleVideoMetadata(urls)
    ).rejects.toThrow('maximum 50 videos')
  })

  it('should filter out invalid URLs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'valid1abcde',
            snippet: {
              title: 'Valid Video',
              channelTitle: 'Channel',
              channelId: 'UC1',
              tags: [],
              thumbnails: {},
            },
          },
        ],
      }),
    })

    const metadata = await client.getMultipleVideoMetadata([
      'https://youtube.com/watch?v=valid1abcde',
      'https://not-youtube.com/video', // invalid
    ])

    expect(metadata).toHaveLength(1)
    expect(metadata[0].videoId).toBe('valid1abcde')
  })
})
