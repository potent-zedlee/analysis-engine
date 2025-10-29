/**
 * Hand Analyzer
 *
 * Main analysis engine that orchestrates:
 * 1. Video analysis using Gemini API
 * 2. Hand extraction (all hands at once)
 * 3. Error detection and validation
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

  constructor(apiKey: string) {
    // this.sceneDetector = new SceneChangeDetector()
    // this.boundaryDetector = new HandBoundaryDetector({ geminiApiKey: apiKey })
    this.geminiClient = new GeminiClient({ apiKey })
    this.promptBuilder = new MasterPromptBuilder()
    // this.errorAnalyzer = new ErrorAnalyzer() // No longer used
    this.promptOptimizer = new PromptOptimizer()
  }

  /**
   * Analyze a video and extract all hands with iteration
   *
   * NEW: Bypasses scene change detection and boundary detection.
   * Instead, analyzes the entire video at once using Gemini API.
   */
  async analyzeVideo(options: AnalysisOptions): Promise<AnalysisResult> {
    const startTime = Date.now()
    // NOTE: maxIterations is no longer used in the new implementation
    // const maxIterations = options.maxIterations || 3

    // Validate input
    if (!options.videoUrl && !options.videoPath) {
      throw new Error('Either videoUrl or videoPath must be provided')
    }

    const videoSource = options.videoUrl || options.videoPath!

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

    // Step 2: Analyze entire video at once
    const response = await this.geminiClient.analyzeVideo<Hand[]>({
      videoPath: videoSource,
      prompt: fullPrompt,
    })

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
      (h) => h.confidence >= this.promptOptimizer.getConfidenceThreshold(1)
    ).length
    const averageConfidence = totalHands > 0
      ? hands.reduce((sum, h) => sum + h.confidence, 0) / totalHands
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
