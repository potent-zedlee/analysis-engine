/**
 * Hand Analyzer
 *
 * Main analysis engine that orchestrates:
 * 1. Hand boundary detection
 * 2. Hand sequence analysis
 * 3. Error detection
 * 4. Iterative improvement (up to 3 iterations)
 */

import { HandBoundaryDetector } from '../../lib/detectors/hand-boundary-detector'
import { GeminiClient } from '../../lib/gemini-client'
import { MasterPromptBuilder } from '../../lib/master-prompt-builder'
import { ErrorAnalyzer } from '../../lib/error-analyzer'
import { PromptOptimizer } from '../../lib/prompt-optimizer'
import type { Hand } from '../../lib/types/hand'
import type { HandError } from '../../lib/types/error'
import type { IterationContext } from '../../lib/prompt-optimizer'

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

export interface HandIterationResult {
  hand: Hand
  errors: HandError[]
  iterationNumber: number
  success: boolean
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hand Analyzer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class HandAnalyzer {
  private boundaryDetector: HandBoundaryDetector
  private geminiClient: GeminiClient
  private promptBuilder: MasterPromptBuilder
  private errorAnalyzer: ErrorAnalyzer
  private promptOptimizer: PromptOptimizer

  constructor(apiKey: string) {
    this.boundaryDetector = new HandBoundaryDetector(apiKey)
    this.geminiClient = new GeminiClient(apiKey)
    this.promptBuilder = new MasterPromptBuilder()
    this.errorAnalyzer = new ErrorAnalyzer()
    this.promptOptimizer = new PromptOptimizer()
  }

  /**
   * Analyze a video and extract all hands with iteration
   */
  async analyzeVideo(options: AnalysisOptions): Promise<AnalysisResult> {
    const startTime = Date.now()
    const maxIterations = options.maxIterations || 3

    // Validate input
    if (!options.videoUrl && !options.videoPath) {
      throw new Error('Either videoUrl or videoPath must be provided')
    }

    // Step 1: Detect hand boundaries
    const boundaries = await this.boundaryDetector.detectHandBoundaries(
      options.videoUrl || options.videoPath!
    )

    // Step 2: Analyze each hand with iteration
    const hands: Hand[] = []
    let totalIterations = 0

    for (const boundary of boundaries) {
      const result = await this.analyzeHandWithIteration(
        options.videoUrl || options.videoPath!,
        boundary.startTime,
        boundary.endTime,
        options.layout,
        maxIterations
      )

      hands.push(result.hand)
      totalIterations += result.iterationNumber
    }

    // Step 3: Calculate metrics
    const processingTime = Date.now() - startTime
    const successfulHands = hands.filter(
      (h) => h.confidence >= this.promptOptimizer.getConfidenceThreshold(1)
    ).length
    const averageConfidence =
      hands.reduce((sum, h) => sum + h.confidence, 0) / hands.length

    return {
      hands,
      totalHands: boundaries.length,
      successfulHands,
      failedHands: hands.length - successfulHands,
      averageConfidence,
      totalIterations,
      processingTime,
    }
  }

  /**
   * Analyze a single hand with up to 3 iterations
   */
  private async analyzeHandWithIteration(
    videoSource: string,
    startTime: string,
    endTime: string,
    layout: string | undefined,
    maxIterations: number
  ): Promise<HandIterationResult> {
    let iterationNumber = 1
    let currentHand: Hand | null = null
    let currentErrors: HandError[] = []

    while (iterationNumber <= maxIterations) {
      // Build prompt (optimized for iteration > 1)
      let prompt: string
      if (iterationNumber === 1) {
        // First iteration: use base prompt
        prompt = this.promptBuilder.buildForLayout(layout || 'triton')
      } else {
        // Subsequent iterations: optimize prompt
        const context: IterationContext = {
          iterationNumber,
          previousErrors: currentErrors,
          previousConfidence: currentHand?.confidence || 0,
          handId: currentHand?.hand_id || 'unknown',
        }
        const optimized = this.promptOptimizer.optimizePrompt(
          this.promptBuilder.buildForLayout(layout || 'triton'),
          context
        )
        prompt = optimized.optimizedPrompt
      }

      // Analyze hand
      currentHand = await this.geminiClient.analyzeHandSequence(
        videoSource,
        startTime,
        endTime,
        prompt
      )

      // Validate with error analyzer
      const report = await this.errorAnalyzer.analyzeHands([currentHand])
      currentErrors = report.errorsByHand[currentHand.hand_id] || []

      // Check if we should retry
      const shouldRetry = this.promptOptimizer.shouldRetry(
        currentHand,
        currentErrors,
        iterationNumber
      )

      if (!shouldRetry) {
        // Success! No need to retry
        return {
          hand: currentHand,
          errors: currentErrors,
          iterationNumber,
          success: true,
        }
      }

      // Increment iteration and retry
      iterationNumber++
    }

    // Max iterations reached
    return {
      hand: currentHand!,
      errors: currentErrors,
      iterationNumber: maxIterations,
      success: false,
    }
  }

  /**
   * Analyze a single hand (without iteration, for testing)
   */
  async analyzeSingleHand(
    videoSource: string,
    startTime: string,
    endTime: string,
    layout?: string
  ): Promise<Hand> {
    const prompt = this.promptBuilder.buildForLayout(layout || 'triton')
    return await this.geminiClient.analyzeHandSequence(
      videoSource,
      startTime,
      endTime,
      prompt
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default HandAnalyzer
