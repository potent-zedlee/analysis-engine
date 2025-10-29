/**
 * YouTube Data API v3 Client
 *
 * Extracts video metadata (title, description, channel) from YouTube URLs
 * Used for layout detection based on video title/description keywords
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Type Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface VideoMetadata {
  videoId: string
  title: string
  description: string
  channelTitle: string
  channelId: string
  tags: string[]
  publishedAt: string
  thumbnail: string
}

export interface YouTubeAPIConfig {
  apiKey: string
  timeout?: number // milliseconds
}

// Internal API response types
interface YouTubeErrorResponse {
  error?: {
    message?: string
    code?: number
  }
}

interface YouTubeVideoResponse {
  items?: Array<{
    snippet?: {
      title?: string
      description?: string
      channelTitle?: string
      channelId?: string
      tags?: string[]
      publishedAt?: string
      thumbnails?: {
        high?: {
          url?: string
        }
        default?: {
          url?: string
        }
      }
    }
  }>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// YouTube API Client
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class YouTubeAPIClient {
  private apiKey: string
  private timeout: number
  private baseUrl = 'https://www.googleapis.com/youtube/v3'

  constructor(config: YouTubeAPIConfig) {
    if (!config.apiKey) {
      throw new Error('YouTube API key is required')
    }

    this.apiKey = config.apiKey
    this.timeout = config.timeout || 10000 // 10초 기본값
  }

  /**
   * Extract video ID from various YouTube URL formats
   *
   * Supported formats:
   * - https://youtube.com/watch?v=VIDEO_ID
   * - https://youtu.be/VIDEO_ID
   * - https://youtube.com/embed/VIDEO_ID
   * - https://youtube.com/v/VIDEO_ID
   * - https://m.youtube.com/watch?v=VIDEO_ID
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      // youtube.com/watch?v=VIDEO_ID
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      // youtu.be/VIDEO_ID
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/embed/VIDEO_ID
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/v/VIDEO_ID
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      // m.youtube.com/watch?v=VIDEO_ID
      /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Check if URL is a valid YouTube URL
   */
  isYouTubeURL(url: string): boolean {
    return this.extractVideoId(url) !== null
  }

  /**
   * Fetch video metadata from YouTube Data API
   *
   * @param videoUrl - YouTube video URL
   * @returns Video metadata including title, description, channel info, tags
   * @throws Error if video not found or API error
   */
  async getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
    // 1. Extract video ID
    const videoId = this.extractVideoId(videoUrl)
    if (!videoId) {
      throw new Error(`Invalid YouTube URL: ${videoUrl}`)
    }

    // 2. Build API request URL
    const apiUrl = `${this.baseUrl}/videos?` + new URLSearchParams({
      part: 'snippet',
      id: videoId,
      key: this.apiKey,
    }).toString()

    // 3. Fetch metadata with timeout
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(apiUrl, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // 4. Check API response
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as YouTubeErrorResponse
        throw new YouTubeAPIError(
          `YouTube API error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        )
      }

      const data = (await response.json()) as YouTubeVideoResponse

      // 5. Validate response data
      if (!data.items || data.items.length === 0) {
        throw new YouTubeAPIError(`Video not found: ${videoId}`)
      }

      // 6. Parse and return metadata
      const snippet = data.items[0].snippet

      return {
        videoId,
        title: snippet?.title || '',
        description: snippet?.description || '',
        channelTitle: snippet?.channelTitle || '',
        channelId: snippet?.channelId || '',
        tags: snippet?.tags || [],
        publishedAt: snippet?.publishedAt || '',
        thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || '',
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new YouTubeAPIError(
          `YouTube API request timeout after ${this.timeout}ms`
        )
      }

      if (error instanceof YouTubeAPIError) {
        throw error
      }

      throw new YouTubeAPIError(`Failed to fetch video metadata: ${error.message}`)
    }
  }

  /**
   * Batch fetch metadata for multiple videos (up to 50)
   *
   * @param videoUrls - Array of YouTube URLs
   * @returns Array of video metadata
   */
  async getMultipleVideoMetadata(
    videoUrls: string[]
  ): Promise<VideoMetadata[]> {
    if (videoUrls.length === 0) {
      return []
    }

    if (videoUrls.length > 50) {
      throw new Error('YouTube API supports maximum 50 videos per batch request')
    }

    // Extract all video IDs
    const videoIds = videoUrls
      .map((url) => this.extractVideoId(url))
      .filter((id): id is string => id !== null)

    if (videoIds.length === 0) {
      throw new Error('No valid YouTube URLs provided')
    }

    // Build API request
    const apiUrl = `${this.baseUrl}/videos?` + new URLSearchParams({
      part: 'snippet',
      id: videoIds.join(','),
      key: this.apiKey,
    }).toString()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2) // 배치는 더 긴 타임아웃

      const response = await fetch(apiUrl, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new YouTubeAPIError(`YouTube API error: ${response.status}`)
      }

      const data = (await response.json()) as YouTubeVideoResponse

      return (data.items || []).map((item: any) => ({
        videoId: item.id,
        title: item.snippet.title || '',
        description: item.snippet.description || '',
        channelTitle: item.snippet.channelTitle || '',
        channelId: item.snippet.channelId || '',
        tags: item.snippet.tags || [],
        publishedAt: item.snippet.publishedAt || '',
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      }))
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new YouTubeAPIError(
          `YouTube API batch request timeout after ${this.timeout * 2}ms`
        )
      }

      throw new YouTubeAPIError(`Failed to fetch batch metadata: ${error.message}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Custom Error Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class YouTubeAPIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'YouTubeAPIError'
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default YouTubeAPIClient
