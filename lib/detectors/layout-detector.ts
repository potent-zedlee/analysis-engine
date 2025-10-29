/**
 * Layout Detector
 *
 * Detects poker tournament layout from YouTube video metadata
 * Uses keyword matching algorithm based on title, description, channel name, and tags
 */

import { YouTubeAPIClient, VideoMetadata } from '../youtube-api.js'
import { LayoutType } from '../layouts.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Type Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface LayoutDetectionResult {
  layout: LayoutType
  confidence: number // 0.0 - 1.0
  matchedKeywords: string[]
  source: 'youtube_metadata' | 'fallback' | 'manual'
  metadata?: VideoMetadata // For debugging
  processingTime: number // milliseconds
}

export interface LayoutDetectorConfig {
  youtubeApiKey: string
  confidenceThreshold?: number // Default: 0.7
  enableFallback?: boolean // Default: true
}

interface LayoutKeywords {
  primary: string[] // High confidence keywords (50 points)
  secondary: string[] // Medium confidence keywords (20 points)
  channelNames: string[] // Channel name matching (30 points)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Layout Keywords Database
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LAYOUT_KEYWORDS: Record<LayoutType, LayoutKeywords> = {
  triton: {
    primary: ['triton poker', 'triton', 'triton series'],
    secondary: [
      'monte carlo',
      'cyprus',
      'jeju',
      'london',
      'high stakes',
      'high roller',
      'super high roller',
    ],
    channelNames: ['Triton Poker', 'PokerGO'],
  },

  hustler: {
    primary: ['hustler casino live', 'hustler casino', 'hcl'],
    secondary: [
      'los angeles',
      'gardena',
      'hustler',
      'garrett adelstein',
      'nick vertucci',
    ],
    channelNames: ['Hustler Casino Live'],
  },

  wsop: {
    primary: ['wsop', 'world series of poker', 'world series'],
    secondary: [
      'main event',
      'bracelet',
      'rio',
      'horseshoe',
      'bally',
      'espn',
      'caesars',
    ],
    channelNames: ['World Series of Poker', 'ESPN', 'PokerGO', 'WSOP'],
  },

  apt: {
    primary: ['apt', 'asia poker tour', 'asian poker tour'],
    secondary: ['macau', 'manila', 'tokyo', 'seoul', 'bangkok', 'vietnam'],
    channelNames: ['Asia Poker Tour', 'APT Poker'],
  },

  base: {
    // Fallback - no specific keywords
    primary: [],
    secondary: [],
    channelNames: [],
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Layout Detector Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class LayoutDetector {
  private youtubeClient: YouTubeAPIClient
  private confidenceThreshold: number
  private enableFallback: boolean

  constructor(config: LayoutDetectorConfig) {
    this.youtubeClient = new YouTubeAPIClient({
      apiKey: config.youtubeApiKey,
    })
    this.confidenceThreshold = config.confidenceThreshold ?? 0.7
    this.enableFallback = config.enableFallback ?? true
  }

  /**
   * Detect layout from YouTube video URL
   *
   * @param videoUrl - YouTube video URL
   * @returns Layout detection result with confidence score
   */
  async detectLayout(videoUrl: string): Promise<LayoutDetectionResult> {
    const startTime = Date.now()

    // 1. Check if URL is YouTube
    if (!this.youtubeClient.isYouTubeURL(videoUrl)) {
      // Not a YouTube URL → Fallback to 'base'
      return {
        layout: 'base',
        confidence: 0.5,
        matchedKeywords: [],
        source: 'fallback',
        processingTime: Date.now() - startTime,
      }
    }

    try {
      // 2. Fetch video metadata
      const metadata = await this.youtubeClient.getVideoMetadata(videoUrl)

      // 3. Detect layout from metadata
      const result = this.detectFromMetadata(metadata)

      result.processingTime = Date.now() - startTime
      result.metadata = metadata

      return result
    } catch (error) {
      // API error → Fallback
      if (this.enableFallback) {
        return {
          layout: 'base',
          confidence: 0.5,
          matchedKeywords: [],
          source: 'fallback',
          processingTime: Date.now() - startTime,
        }
      }

      throw error
    }
  }

  /**
   * Detect layout from video metadata
   * Can be used independently if metadata is already available
   */
  detectFromMetadata(metadata: VideoMetadata): LayoutDetectionResult {
    // 1. Calculate scores for each layout
    const scores = this.calculateScores(metadata)

    // 2. Find winner (highest score)
    const entries = Object.entries(scores) as [LayoutType, number][]
    const sorted = entries.sort((a, b) => b[1] - a[1])
    const [winner, winnerScore] = sorted[0]

    // 3. Calculate confidence (normalize score to 0-1)
    // Max possible score: 50 (primary) + 20*N (secondary) + 30 (channel)
    // We'll use 100 as reference (50 + 30 + 20)
    const confidence = Math.min(winnerScore / 100, 1.0)

    // 4. Fallback if confidence too low
    if (confidence < this.confidenceThreshold && this.enableFallback) {
      return {
        layout: 'base',
        confidence: 0.5,
        matchedKeywords: [],
        source: 'fallback',
        processingTime: 0,
      }
    }

    // 5. Get matched keywords for winner
    const matchedKeywords = this.getMatchedKeywords(metadata, winner)

    return {
      layout: winner,
      confidence,
      matchedKeywords,
      source: 'youtube_metadata',
      processingTime: 0,
    }
  }

  /**
   * Calculate keyword matching scores for all layouts
   */
  private calculateScores(metadata: VideoMetadata): Record<LayoutType, number> {
    const scores: Record<string, number> = {
      triton: 0,
      hustler: 0,
      wsop: 0,
      apt: 0,
      base: 0,
    }

    // Combine all text fields into one searchable string
    const combinedText = `
      ${metadata.title}
      ${metadata.description}
      ${metadata.channelTitle}
      ${metadata.tags.join(' ')}
    `.toLowerCase()

    // Score each layout
    for (const [layout, keywords] of Object.entries(LAYOUT_KEYWORDS)) {
      if (layout === 'base') continue // Skip base layout

      // Primary keywords (50 points each)
      for (const keyword of keywords.primary) {
        if (combinedText.includes(keyword.toLowerCase())) {
          scores[layout] += 50
        }
      }

      // Secondary keywords (20 points each)
      for (const keyword of keywords.secondary) {
        if (combinedText.includes(keyword.toLowerCase())) {
          scores[layout] += 20
        }
      }

      // Channel name matching (30 points)
      for (const channelName of keywords.channelNames) {
        if (
          metadata.channelTitle.toLowerCase().includes(channelName.toLowerCase())
        ) {
          scores[layout] += 30
        }
      }
    }

    return scores as Record<LayoutType, number>
  }

  /**
   * Get list of matched keywords for a specific layout
   */
  private getMatchedKeywords(
    metadata: VideoMetadata,
    layout: LayoutType
  ): string[] {
    if (layout === 'base') return []

    const keywords = LAYOUT_KEYWORDS[layout]
    const matched: string[] = []

    const combinedText = `
      ${metadata.title}
      ${metadata.description}
      ${metadata.channelTitle}
      ${metadata.tags.join(' ')}
    `.toLowerCase()

    // Check primary keywords
    for (const keyword of keywords.primary) {
      if (combinedText.includes(keyword.toLowerCase())) {
        matched.push(keyword)
      }
    }

    // Check secondary keywords
    for (const keyword of keywords.secondary) {
      if (combinedText.includes(keyword.toLowerCase())) {
        matched.push(keyword)
      }
    }

    // Check channel names
    for (const channelName of keywords.channelNames) {
      if (
        metadata.channelTitle.toLowerCase().includes(channelName.toLowerCase())
      ) {
        matched.push(`channel:${channelName}`)
      }
    }

    return matched
  }

  /**
   * Manually override layout detection
   * Useful for edge cases or testing
   */
  forceLayout(layout: LayoutType): LayoutDetectionResult {
    return {
      layout,
      confidence: 1.0,
      matchedKeywords: [`manual:${layout}`],
      source: 'manual',
      processingTime: 0,
    }
  }

  /**
   * Get confidence threshold
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold
  }

  /**
   * Update confidence threshold
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1')
    }
    this.confidenceThreshold = threshold
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default LayoutDetector
