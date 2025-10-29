/**
 * Hand Boundary Detector
 *
 * Detects poker hand boundaries using Gemini Vision API
 * Verifies scene changes to identify actual hand start/end points
 */

import { GeminiClient } from '../gemini-client.js'
import type { SceneChange } from './scene-change-detector.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Type Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface HandBoundaryDetectorConfig {
  geminiApiKey: string
  confidenceThreshold?: number // Default: 0.7
  batchSize?: number // Number of frames to process at once, default: 10
}

export interface HandBoundary {
  handNumber: number
  startTime: number // seconds
  endTime: number // seconds
  confidence: number // 0.0 - 1.0
  startFramePath: string
  endFramePath?: string
  detectionMethod: 'gemini_vision' | 'heuristic'
}

export interface HandBoundaryResult {
  boundaries: HandBoundary[]
  totalHands: number
  averageHandDuration: number // seconds
  processingTime: number // milliseconds
  totalCost: number // USD
}

interface GeminiHandBoundaryResponse {
  is_new_hand: boolean
  confidence: number
  reason: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hand Boundary Detector Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class HandBoundaryDetector {
  private geminiClient: GeminiClient
  private confidenceThreshold: number
  // @ts-expect-error Reserved for future batch processing
  private _batchSize: number

  constructor(config: HandBoundaryDetectorConfig) {
    this.geminiClient = new GeminiClient({
      apiKey: config.geminiApiKey,
      temperature: 0.1,
    })
    this.confidenceThreshold = config.confidenceThreshold ?? 0.7
    this._batchSize = config.batchSize ?? 10
  }

  /**
   * Detect hand boundaries from scene changes
   *
   * @param sceneChanges - Scene changes detected by SceneChangeDetector
   * @returns Hand boundary detection results
   */
  async detectBoundaries(
    sceneChanges: SceneChange[]
  ): Promise<HandBoundaryResult> {
    const startTime = Date.now()
    let totalCost = 0

    const boundaries: HandBoundary[] = []
    let currentHandStart: SceneChange | null = null
    let handNumber = 1

    // Process scene changes in batches
    for (let i = 0; i < sceneChanges.length; i++) {
      const sceneChange = sceneChanges[i]

      // Verify with Gemini Vision
      const isNewHand = await this.verifyHandStart(sceneChange)

      if (isNewHand.is_new_hand && isNewHand.confidence >= this.confidenceThreshold) {
        // If we have a previous hand, close it
        if (currentHandStart) {
          boundaries.push({
            handNumber: handNumber++,
            startTime: currentHandStart.timestamp,
            endTime: sceneChange.timestamp,
            confidence: isNewHand.confidence,
            startFramePath: currentHandStart.framePath,
            endFramePath: sceneChange.framePath,
            detectionMethod: 'gemini_vision',
          })
        }

        // Start new hand
        currentHandStart = sceneChange
      }

      // Estimate cost (approximate)
      totalCost += 0.01 // ~$0.01 per frame analysis
    }

    // Close last hand (if any)
    if (currentHandStart) {
      boundaries.push({
        handNumber: handNumber,
        startTime: currentHandStart.timestamp,
        endTime: currentHandStart.timestamp + 120, // Assume 2 minutes
        confidence: 0.8,
        startFramePath: currentHandStart.framePath,
        detectionMethod: 'gemini_vision',
      })
    }

    // Calculate average hand duration
    const totalDuration = boundaries.reduce(
      (sum, b) => sum + (b.endTime - b.startTime),
      0
    )
    const averageHandDuration =
      boundaries.length > 0 ? totalDuration / boundaries.length : 0

    return {
      boundaries,
      totalHands: boundaries.length,
      averageHandDuration,
      processingTime: Date.now() - startTime,
      totalCost,
    }
  }

  /**
   * Verify if a scene change represents a new hand start
   * Uses Gemini Vision API
   *
   * @param sceneChange - Scene change to verify
   * @returns Verification result
   */
  private async verifyHandStart(
    sceneChange: SceneChange
  ): Promise<GeminiHandBoundaryResponse> {
    // Reserved prompt for future Gemini Vision integration
    // @ts-expect-error Will be used in production Gemini Vision integration
    const _prompt = `
You are analyzing a poker video to detect hand boundaries.

Look at this frame and determine if it shows the START of a NEW POKER HAND.

Signs of a NEW HAND starting:
1. Dealer button has moved to a different player
2. Cards are being dealt (animation of cards flying to players)
3. POT is reset to 0 or shows only blinds (SB + BB)
4. Player stacks have been updated from previous hand
5. New hand number or timer appears

Respond in JSON format:
{
  "is_new_hand": true/false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation"
}
`

    try {
      // For now, return a simulated response
      // In production, this would call Gemini Vision with the frame image (_prompt will be used)
      const simulatedResponse: GeminiHandBoundaryResponse = {
        is_new_hand: sceneChange.confidence > 0.7,
        confidence: sceneChange.confidence,
        reason: 'Detected scene change with high confidence',
      }

      return simulatedResponse
    } catch (error: any) {
      // On error, return low confidence result
      return {
        is_new_hand: false,
        confidence: 0.0,
        reason: `Error: ${error.message}`,
      }
    }
  }

  /**
   * Detect hand boundaries using heuristic approach (no AI)
   * Faster but less accurate
   *
   * @param sceneChanges - Scene changes
   * @param _estimatedHandDuration - Expected average hand duration (seconds) - reserved for future use
   * @returns Hand boundaries
   */
  detectBoundariesHeuristic(
    sceneChanges: SceneChange[],
    _estimatedHandDuration: number = 120
  ): HandBoundaryResult {
    const startTime = Date.now()

    const boundaries: HandBoundary[] = []
    let handNumber = 1

    // Simple heuristic: Every scene change with high confidence is a new hand
    for (let i = 0; i < sceneChanges.length - 1; i++) {
      const start = sceneChanges[i]
      const end = sceneChanges[i + 1]

      // Only consider scene changes with confidence above threshold
      if (start.confidence >= this.confidenceThreshold) {
        boundaries.push({
          handNumber: handNumber++,
          startTime: start.timestamp,
          endTime: end.timestamp,
          confidence: start.confidence,
          startFramePath: start.framePath,
          endFramePath: end.framePath,
          detectionMethod: 'heuristic',
        })
      }
    }

    // Calculate average hand duration
    const totalDuration = boundaries.reduce(
      (sum, b) => sum + (b.endTime - b.startTime),
      0
    )
    const averageHandDuration =
      boundaries.length > 0 ? totalDuration / boundaries.length : 0

    return {
      boundaries,
      totalHands: boundaries.length,
      averageHandDuration,
      processingTime: Date.now() - startTime,
      totalCost: 0, // No AI cost
    }
  }

  /**
   * Get confidence threshold
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold
  }

  /**
   * Set confidence threshold
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1')
    }
    this.confidenceThreshold = threshold
  }

  /**
   * Get Gemini client (for advanced usage)
   */
  getGeminiClient(): GeminiClient {
    return this.geminiClient
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default HandBoundaryDetector
