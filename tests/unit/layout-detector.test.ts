/**
 * Unit Tests for Layout Detector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LayoutDetector } from '../../lib/detectors/layout-detector'
import type { VideoMetadata } from '../../lib/youtube-api'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Fixtures - Sample Metadata
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TRITON_METADATA: VideoMetadata = {
  videoId: 'triton123',
  title: 'Triton Poker Cyprus 2024 - Day 3 Final Table',
  description: 'Watch the high stakes action from Triton Poker Series...',
  channelTitle: 'Triton Poker',
  channelId: 'UC123',
  tags: ['poker', 'triton', 'high-stakes'],
  publishedAt: '2024-10-01T00:00:00Z',
  thumbnail: 'https://example.com/thumb.jpg',
}

const HUSTLER_METADATA: VideoMetadata = {
  videoId: 'hustler123',
  title: 'Garrett Adelstein vs Phil Ivey - Epic Showdown',
  description: 'Live from Hustler Casino Live in Los Angeles, watch Garrett battle...',
  channelTitle: 'Hustler Casino Live',
  channelId: 'UC456',
  tags: ['poker', 'cash-game', 'los-angeles'],
  publishedAt: '2024-10-01T00:00:00Z',
  thumbnail: 'https://example.com/thumb.jpg',
}

const WSOP_METADATA: VideoMetadata = {
  videoId: 'wsop123',
  title: 'WSOP 2024 Main Event - Final Table | ESPN',
  description: 'World Series of Poker coverage from Horseshoe Casino...',
  channelTitle: 'World Series of Poker',
  channelId: 'UC789',
  tags: ['wsop', 'bracelet', 'tournament'],
  publishedAt: '2024-10-01T00:00:00Z',
  thumbnail: 'https://example.com/thumb.jpg',
}

const APT_METADATA: VideoMetadata = {
  videoId: 'apt123',
  title: 'Asia Poker Tour Manila 2024 - Day 2',
  description: 'APT tournament action from Manila...',
  channelTitle: 'Asia Poker Tour',
  channelId: 'UC101',
  tags: ['apt', 'asia', 'poker'],
  publishedAt: '2024-10-01T00:00:00Z',
  thumbnail: 'https://example.com/thumb.jpg',
}

const UNCLEAR_METADATA: VideoMetadata = {
  videoId: 'unclear123',
  title: 'Poker Game Highlights',
  description: 'Some poker game',
  channelTitle: 'Random Poker Channel',
  channelId: 'UC999',
  tags: ['poker'],
  publishedAt: '2024-10-01T00:00:00Z',
  thumbnail: 'https://example.com/thumb.jpg',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - Configuration', () => {
  it('should initialize with default settings', () => {
    const detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })

    expect(detector.getConfidenceThreshold()).toBe(0.7)
  })

  it('should accept custom confidence threshold', () => {
    const detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
      confidenceThreshold: 0.85,
    })

    expect(detector.getConfidenceThreshold()).toBe(0.85)
  })

  it('should allow updating confidence threshold', () => {
    const detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })

    detector.setConfidenceThreshold(0.9)
    expect(detector.getConfidenceThreshold()).toBe(0.9)
  })

  it('should throw error for invalid threshold', () => {
    const detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })

    expect(() => detector.setConfidenceThreshold(1.5)).toThrow()
    expect(() => detector.setConfidenceThreshold(-0.1)).toThrow()
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Triton Layout Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - Triton Detection', () => {
  let detector: LayoutDetector

  beforeEach(() => {
    detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })
  })

  it('should detect Triton from title keyword', () => {
    const result = detector.detectFromMetadata(TRITON_METADATA)

    expect(result.layout).toBe('triton')
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.source).toBe('youtube_metadata')
    expect(result.matchedKeywords).toContain('triton poker')
  })

  it('should detect Triton from channel name', () => {
    const metadata: VideoMetadata = {
      ...TRITON_METADATA,
      title: 'High Stakes Poker Game',
      description: 'Some poker game',
      channelTitle: 'Triton Poker',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('triton')
    expect(result.matchedKeywords).toContain('channel:Triton Poker')
  })

  it('should detect Triton from secondary keywords', () => {
    const metadata: VideoMetadata = {
      ...TRITON_METADATA,
      title: 'High Roller Poker - Monte Carlo 2024',
      description: 'Super high roller action',
      channelTitle: 'PokerGO',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('triton')
    expect(result.matchedKeywords.length).toBeGreaterThan(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Hustler Layout Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - Hustler Detection', () => {
  let detector: LayoutDetector

  beforeEach(() => {
    detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })
  })

  it('should detect Hustler from title keyword', () => {
    const result = detector.detectFromMetadata(HUSTLER_METADATA)

    expect(result.layout).toBe('hustler')
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.source).toBe('youtube_metadata')
  })

  it('should detect Hustler from channel name', () => {
    const metadata: VideoMetadata = {
      ...HUSTLER_METADATA,
      title: 'Poker Cash Game',
      channelTitle: 'Hustler Casino Live',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('hustler')
    expect(result.matchedKeywords).toContain('channel:Hustler Casino Live')
  })

  it('should detect Hustler from HCL abbreviation', () => {
    const metadata: VideoMetadata = {
      ...HUSTLER_METADATA,
      title: 'HCL Poker Game - Crazy Action',
      description: 'HCL live stream',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('hustler')
    expect(result.matchedKeywords).toContain('hcl')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: WSOP Layout Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - WSOP Detection', () => {
  let detector: LayoutDetector

  beforeEach(() => {
    detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })
  })

  it('should detect WSOP from title keyword', () => {
    const result = detector.detectFromMetadata(WSOP_METADATA)

    expect(result.layout).toBe('wsop')
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.source).toBe('youtube_metadata')
    expect(result.matchedKeywords).toContain('wsop')
  })

  it('should detect WSOP from "World Series of Poker"', () => {
    const metadata: VideoMetadata = {
      ...WSOP_METADATA,
      title: 'World Series of Poker 2024',
      description: 'WSOP coverage',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('wsop')
    expect(result.matchedKeywords).toContain('world series of poker')
  })

  it('should detect WSOP from channel name', () => {
    const metadata: VideoMetadata = {
      ...WSOP_METADATA,
      title: 'Poker Tournament',
      channelTitle: 'ESPN',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('wsop')
    expect(result.matchedKeywords).toContain('channel:ESPN')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: APT Layout Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - APT Detection', () => {
  let detector: LayoutDetector

  beforeEach(() => {
    detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })
  })

  it('should detect APT from title keyword', () => {
    const result = detector.detectFromMetadata(APT_METADATA)

    expect(result.layout).toBe('apt')
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.source).toBe('youtube_metadata')
  })

  it('should detect APT from "Asia Poker Tour"', () => {
    const metadata: VideoMetadata = {
      ...APT_METADATA,
      title: 'Asia Poker Tour Championship 2024',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('apt')
    expect(result.matchedKeywords).toContain('asia poker tour')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Fallback to Base
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - Fallback', () => {
  let detector: LayoutDetector

  beforeEach(() => {
    detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
      confidenceThreshold: 0.7,
    })
  })

  it('should fallback to "base" for unclear titles', () => {
    const result = detector.detectFromMetadata(UNCLEAR_METADATA)

    expect(result.layout).toBe('base')
    expect(result.confidence).toBeLessThan(0.7)
    expect(result.source).toBe('fallback')
  })

  it('should not fallback if confidence threshold is low', () => {
    detector.setConfidenceThreshold(0.3) // Very low threshold

    // Metadata with some secondary keywords (40 points = 0.4 confidence)
    const lowConfidenceMetadata: VideoMetadata = {
      videoId: 'low123',
      title: 'High Stakes Poker in Monte Carlo',
      description: 'Some poker game',
      channelTitle: 'Random Poker Channel',
      channelId: 'UC999',
      tags: ['poker'],
      publishedAt: '2024-10-01T00:00:00Z',
      thumbnail: 'https://example.com/thumb.jpg',
    }

    const result = detector.detectFromMetadata(lowConfidenceMetadata)

    // Should not fallback because 0.4 > 0.3 threshold
    expect(result.source).toBe('youtube_metadata')
    expect(result.confidence).toBeGreaterThan(0.3)
  })

  it('should fallback if disabled', () => {
    const detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
      enableFallback: false,
    })

    const result = detector.detectFromMetadata(UNCLEAR_METADATA)

    // Should return low confidence result, not fallback
    expect(result.source).toBe('youtube_metadata')
    expect(result.confidence).toBeLessThan(0.7)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Manual Override
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - Manual Override', () => {
  let detector: LayoutDetector

  beforeEach(() => {
    detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })
  })

  it('should allow manual layout override', () => {
    const result = detector.forceLayout('triton')

    expect(result.layout).toBe('triton')
    expect(result.confidence).toBe(1.0)
    expect(result.source).toBe('manual')
    expect(result.matchedKeywords).toContain('manual:triton')
  })

  it('should override for any layout', () => {
    const layouts: Array<'triton' | 'hustler' | 'wsop' | 'apt' | 'base'> = [
      'triton',
      'hustler',
      'wsop',
      'apt',
      'base',
    ]

    for (const layout of layouts) {
      const result = detector.forceLayout(layout)
      expect(result.layout).toBe(layout)
      expect(result.confidence).toBe(1.0)
    }
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Full Pipeline (with YouTube API)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - Full Pipeline', () => {
  let detector: LayoutDetector

  beforeEach(() => {
    detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })
    vi.clearAllMocks()
  })

  it('should detect layout from YouTube URL (mocked)', async () => {
    // Mock YouTube API response with correct structure
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: 'triton123xyz',
            snippet: {
              title: TRITON_METADATA.title,
              description: TRITON_METADATA.description,
              channelTitle: TRITON_METADATA.channelTitle,
              channelId: TRITON_METADATA.channelId,
              tags: TRITON_METADATA.tags,
              publishedAt: TRITON_METADATA.publishedAt,
              thumbnails: {
                high: {
                  url: TRITON_METADATA.thumbnail,
                },
              },
            },
          },
        ],
      }),
    })

    global.fetch = mockFetch as any

    const result = await detector.detectLayout(
      'https://youtube.com/watch?v=triton123xyz'
    )

    expect(mockFetch).toHaveBeenCalled()
    expect(result.layout).toBe('triton')
    expect(result.confidence).toBeGreaterThan(0.7)
    expect(result.source).toBe('youtube_metadata')
    expect(result.metadata).toBeDefined()
    expect(result.processingTime).toBeGreaterThanOrEqual(0)
  })

  it('should fallback for non-YouTube URLs', async () => {
    const result = await detector.detectLayout('https://not-youtube.com/video')

    expect(result.layout).toBe('base')
    expect(result.confidence).toBe(0.5)
    expect(result.source).toBe('fallback')
  })

  it('should fallback on API error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

    const result = await detector.detectLayout(
      'https://youtube.com/watch?v=errorvidxxx'
    )

    expect(result.layout).toBe('base')
    expect(result.source).toBe('fallback')
  })

  it('should throw error on API failure if fallback disabled', async () => {
    const detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
      enableFallback: false,
    })

    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

    await expect(
      detector.detectLayout('https://youtube.com/watch?v=errorvidxxx')
    ).rejects.toThrow()
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Edge Cases
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('LayoutDetector - Edge Cases', () => {
  let detector: LayoutDetector

  beforeEach(() => {
    detector = new LayoutDetector({
      youtubeApiKey: 'test-key',
    })
  })

  it('should handle empty metadata fields', () => {
    const metadata: VideoMetadata = {
      videoId: 'empty123',
      title: '',
      description: '',
      channelTitle: '',
      channelId: '',
      tags: [],
      publishedAt: '',
      thumbnail: '',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('base')
    expect(result.source).toBe('fallback')
  })

  it('should be case-insensitive', () => {
    const metadata: VideoMetadata = {
      ...TRITON_METADATA,
      title: 'TRITON POKER CYPRUS 2024',
      description: 'WATCH THE HIGH STAKES ACTION',
    }

    const result = detector.detectFromMetadata(metadata)

    expect(result.layout).toBe('triton')
  })

  it('should handle multiple matching layouts (highest score wins)', () => {
    const metadata: VideoMetadata = {
      videoId: 'mixed123',
      title: 'Triton Poker at WSOP 2024', // Both Triton and WSOP
      description: 'Special event',
      channelTitle: 'Poker Channel',
      channelId: 'UC000',
      tags: [],
      publishedAt: '2024-10-01T00:00:00Z',
      thumbnail: '',
    }

    const result = detector.detectFromMetadata(metadata)

    // Both layouts match, but one should have higher score
    expect(['triton', 'wsop']).toContain(result.layout)
  })
})
