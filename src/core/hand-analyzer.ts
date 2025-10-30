/**
 * Hand Analyzer
 *
 * Main analysis engine that orchestrates:
 * 1. Video analysis using Gemini API
 * 2. Hand extraction (all hands at once)
 * 3. Error detection and validation
 * 4. YouTube video download and processing
 *
 * NOTE: Scene change detection and boundary detection are no longer used.
 * The new implementation analyzes the entire video at once.
 */

// import { HandBoundaryDetector } from '../../lib/detectors/hand-boundary-detector.js'
// import { SceneChangeDetector } from '../../lib/detectors/scene-change-detector.js'
import { GeminiClient } from '../../lib/gemini-client.js'
import { MasterPromptBuilder } from '../../lib/master-prompt-builder.js'
// import { ErrorAnalyzer } from '../../lib/error-analyzer.js'
import { PromptOptimizer } from '../../lib/prompt-optimizer.js'
import type { Hand } from '../../lib/types/hand.js'
// import type { HandError } from '../../lib/types/error.js'
// import type { IterationContext } from '../../lib/prompt-optimizer.js'
import ytdl from '@distube/ytdl-core'
import { promises as fs } from 'fs'
import { createWriteStream } from 'fs'
import path from 'path'
import os from 'os'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface HandAnalyzerConfig {
  apiKey: string
  promptsDir?: string // Optional: custom prompts directory path
  layoutsDataPath?: string // Optional: custom layouts.json path
}

export interface AnalysisOptions {
  videoUrl?: string // YouTube URL
  videoPath?: string // Local file path
  layout?: string // Layout type (triton, hustler, wsop, apt)
  maxIterations?: number // Default: 3
}

export interface AnalysisResult {
  hands: Hand[] // Successfully analyzed hands
  totalHands: number // Total hands detected
  successfulHands: number // Hands with confidence above threshold
  failedHands: number // Hands that failed all iterations
  averageConfidence: number // Average confidence across all hands
  totalIterations: number // Total iterations performed
  processingTime: number // Total processing time in ms
}

// NOTE: No longer used in new implementation
// export interface HandIterationResult {
//   hand: Hand
//   errors: HandError[]
//   iterationNumber: number
//   success: boolean
// }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hand Analyzer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class HandAnalyzer {
  // NOTE: Scene and boundary detection are no longer used
  // private sceneDetector: SceneChangeDetector
  // private boundaryDetector: HandBoundaryDetector
  private geminiClient: GeminiClient
  private promptBuilder: MasterPromptBuilder
  // private errorAnalyzer: ErrorAnalyzer // No longer used in new implementation
  private promptOptimizer: PromptOptimizer

  constructor(configOrApiKey: HandAnalyzerConfig | string) {
    // Backwards compatibility: support both string and object
    const config = typeof configOrApiKey === 'string'
      ? { apiKey: configOrApiKey }
      : configOrApiKey

    // this.sceneDetector = new SceneChangeDetector()
    // this.boundaryDetector = new HandBoundaryDetector({ geminiApiKey: config.apiKey })
    this.geminiClient = new GeminiClient({ apiKey: config.apiKey })
    this.promptBuilder = new MasterPromptBuilder({
      promptsDir: config.promptsDir,
      layoutsDataPath: config.layoutsDataPath,
    })
    // this.errorAnalyzer = new ErrorAnalyzer() // No longer used
    this.promptOptimizer = new PromptOptimizer()
  }

  /**
   * Check if a URL is a YouTube URL
   */
  private isYouTubeURL(url: string): boolean {
    return (
      url.includes('youtube.com/watch?v=') ||
      url.includes('youtu.be/') ||
      url.includes('youtube.com/embed/') ||
      url.includes('youtube.com/v/')
    )
  }

  /**
   * Download YouTube video to temporary file with retry logic
   * Returns path to downloaded file
   *
   * Includes anti-bot measures:
   * - Cookie header (from YOUTUBE_COOKIE env var)
   * - User-Agent spoofing
   * - Retry logic (3 attempts with exponential backoff)
   */
  private async downloadYouTubeVideo(
    url: string,
    maxRetries = 3
  ): Promise<string> {
    // Create temp file path
    const tempDir = os.tmpdir()
    const fileName = `youtube-${Date.now()}.mp4`
    const filePath = path.join(tempDir, fileName)

    // Retry loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Download video with anti-bot headers
        await new Promise<void>((resolve, reject) => {
          const videoStream = ytdl(url, {
            quality: 'highest',
            filter: 'videoandaudio',
            requestOptions: {
              headers: {
                // Cookie from environment variable (helps bypass bot detection)
                ...(process.env.YOUTUBE_COOKIE && {
                  cookie: process.env.YOUTUBE_COOKIE,
                }),
                // Spoof User-Agent to appear as Chrome browser
                'User-Agent':
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            },
          })

          const writeStream = createWriteStream(filePath)

          videoStream.pipe(writeStream)

          writeStream.on('finish', () => {
            resolve()
          })

          writeStream.on('error', (error) => {
            reject(
              new Error(`Failed to write YouTube video: ${error.message}`)
            )
          })

          videoStream.on('error', (error) => {
            reject(
              new Error(`Failed to fetch YouTube video: ${error.message}`)
            )
          })
        })

        // Success - return file path
        return filePath
      } catch (error: any) {
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error
        }

        // Wait before retrying (exponential backoff: 2s, 4s, 8s)
        const waitTime = 2000 * attempt
        console.warn(
          `YouTube download attempt ${attempt} failed, retrying in ${waitTime}ms...`,
          error.message
        )
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Failed to download YouTube video after all retries')
  }

  /**
   * Analyze a video and extract all hands with iteration
   *
   * NEW: Bypasses scene change detection and boundary detection.
   * Instead, analyzes the entire video at once using Gemini API.
   *
   * Supports both local files and YouTube URLs.
   * YouTube videos are downloaded, uploaded to Gemini File API, analyzed, then cleaned up.
   */
  async analyzeVideo(options: AnalysisOptions): Promise<AnalysisResult> {
    const startTime = Date.now()
    let tempFilePath: string | null = null
    let fileUri: string | null = null

    try {
      // Validate input
      if (!options.videoUrl && !options.videoPath) {
        throw new Error('Either videoUrl or videoPath must be provided')
      }

      // Step 1: Build prompt for extracting ALL hands from video
      const masterPrompt = await this.promptBuilder.buildPrompt({
        layout: (options.layout as any) || 'triton',
      })

      // Enhanced prompt to extract all hands as array
      const fullPrompt = `${masterPrompt.prompt}

IMPORTANT: Analyze the ENTIRE video and extract ALL poker hands.
Return the result as a JSON array of hands, where each hand follows the structure defined above.

Example format:
[
  { "hand_id": "1", "timestamp": 0, "players": [...], ... },
  { "hand_id": "2", "timestamp": 120, "players": [...], ... },
  ...
]

If no hands are found, return an empty array: []`

      let response: any

      // Step 2: Handle YouTube URLs vs local files
      if (options.videoUrl && this.isYouTubeURL(options.videoUrl)) {
        // YouTube workflow: Download → Upload to File API → Analyze → Cleanup

        // Download YouTube video
        tempFilePath = await this.downloadYouTubeVideo(options.videoUrl)

        // Upload to Gemini File API
        const uploadResult = await this.geminiClient.uploadVideoFile(
          tempFilePath,
          `poker-video-${Date.now()}`
        )
        fileUri = uploadResult.uri

        // Analyze using File API
        response = await this.geminiClient.analyzeVideoFromFileURI<Hand[]>(
          fileUri,
          fullPrompt
        )
      } else {
        // Local file workflow: Direct analysis
        const videoPath = options.videoPath || options.videoUrl!
        response = await this.geminiClient.analyzeVideo<Hand[]>({
          videoPath,
          prompt: fullPrompt,
        })
      }

      let hands = response.data

      // Ensure we got an array
      if (!Array.isArray(hands)) {
        // If single hand was returned, wrap in array
        hands = [hands as any]
      }

      // Step 3: Calculate metrics
      const processingTime = Date.now() - startTime
      const totalHands = hands.length
      const successfulHands = hands.filter(
        (h: Hand) => h.confidence >= this.promptOptimizer.getConfidenceThreshold(1)
      ).length
      const averageConfidence = totalHands > 0
        ? hands.reduce((sum: number, h: Hand) => sum + h.confidence, 0) / totalHands
        : 0

      return {
        hands,
        totalHands,
        successfulHands,
        failedHands: totalHands - successfulHands,
        averageConfidence,
        totalIterations: 1, // Single API call
        processingTime,
      }
    } finally {
      // Cleanup: Delete temp file if it was created
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath)
        } catch (error) {
          console.warn(`Failed to delete temp file ${tempFilePath}:`, error)
        }
      }

      // Note: Gemini File API automatically deletes files after 48 hours
      // No need to manually delete fileUri
    }
  }

  /**
   * Analyze a single hand with up to 3 iterations
   *
   * NOTE: This method is no longer used in the new implementation.
   * Keeping it for reference/future use.
   */
  // private async analyzeHandWithIteration(
  //   videoSource: string,
  //   startTime: string,
  //   endTime: string,
  //   layout: string | undefined,
  //   maxIterations: number
  // ): Promise<HandIterationResult> {
  //   let iterationNumber = 1
  //   let currentHand: Hand | null = null
  //   let currentErrors: HandError[] = []

  //   while (iterationNumber <= maxIterations) {
  //     // Build prompt (optimized for iteration > 1)
  //     let prompt: string
  //     if (iterationNumber === 1) {
  //       // First iteration: use base prompt
  //       const masterPrompt = await this.promptBuilder.buildPrompt({
  //         layout: (layout as any) || 'triton',
  //       })
  //       prompt = masterPrompt.prompt
  //     } else {
  //       // Subsequent iterations: optimize prompt
  //       const context: IterationContext = {
  //         iterationNumber,
  //         previousErrors: currentErrors,
  //         previousConfidence: currentHand?.confidence || 0,
  //         handId: currentHand?.hand_id || 'unknown',
  //       }
  //       const masterPrompt = await this.promptBuilder.buildPrompt({
  //         layout: (layout as any) || 'triton',
  //       })
  //       const optimized = this.promptOptimizer.optimizePrompt(
  //         masterPrompt.prompt,
  //         context
  //       )
  //       prompt = optimized.optimizedPrompt
  //     }

  //     // Analyze hand
  //     // TODO: Implement video clip extraction (startTime to endTime)
  //     // For now, use full video with prompt containing time boundaries
  //     const response = await this.geminiClient.analyzeVideo<Hand>({
  //       videoPath: videoSource,
  //       prompt: `${prompt}\n\nAnalyze the hand between ${startTime} and ${endTime}.`,
  //     })

  //     currentHand = response.data

  //     // Validate with error analyzer
  //     const report = await this.errorAnalyzer.analyzeHands([currentHand])
  //     currentErrors = report.errorsByHand[currentHand.hand_id] || []

  //     // Check if we should retry
  //     const shouldRetry = this.promptOptimizer.shouldRetry(
  //       currentHand,
  //       currentErrors,
  //       iterationNumber
  //     )

  //     if (!shouldRetry) {
  //       // Success! No need to retry
  //       return {
  //         hand: currentHand,
  //         errors: currentErrors,
  //         iterationNumber,
  //         success: true,
  //       }
  //     }

  //     // Increment iteration and retry
  //     iterationNumber++
  //   }

  //   // Max iterations reached
  //   return {
  //     hand: currentHand!,
  //     errors: currentErrors,
  //     iterationNumber: maxIterations,
  //     success: false,
  //   }
  // }

  /**
   * Analyze a single hand (without iteration, for testing)
   */
  async analyzeSingleHand(
    videoSource: string,
    startTime: string,
    endTime: string,
    layout?: string
  ): Promise<Hand> {
    const masterPrompt = await this.promptBuilder.buildPrompt({
      layout: (layout as any) || 'triton',
    })

    // TODO: Implement video clip extraction (startTime to endTime)
    const response = await this.geminiClient.analyzeVideo<Hand>({
      videoPath: videoSource,
      prompt: `${masterPrompt.prompt}\n\nAnalyze the hand between ${startTime} and ${endTime}.`,
    })

    return response.data
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default HandAnalyzer
