/**
 * Prompt Optimizer
 *
 * Optimizes Master Prompts based on previous iteration errors
 * to improve accuracy in subsequent iterations.
 */

import type { Hand } from './types/hand.js'
import type { HandError, ErrorType } from './types/error.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface IterationContext {
  iterationNumber: number // 1, 2, or 3
  previousErrors: HandError[] // Errors from previous iteration
  previousConfidence: number // Confidence from previous iteration
  handId: string // ID of the hand being re-analyzed
}

export interface OptimizationResult {
  optimizedPrompt: string
  confidenceThreshold: number
  focusAreas: string[] // e.g., ["pot_calculation", "card_recognition"]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Prompt Optimizer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class PromptOptimizer {
  /**
   * Optimize master prompt based on iteration context
   */
  optimizePrompt(
    basePrompt: string,
    context: IterationContext
  ): OptimizationResult {
    const focusAreas = this.identifyFocusAreas(context.previousErrors)
    const errorCorrections = this.generateErrorCorrections(
      context.previousErrors
    )
    const iterationInstructions = this.getIterationInstructions(
      context.iterationNumber
    )

    // Build optimized prompt
    let optimizedPrompt = basePrompt

    // Add iteration number
    optimizedPrompt += `\n\n# ITERATION ${context.iterationNumber}\n`
    optimizedPrompt += `This is iteration ${context.iterationNumber} of 3. `
    optimizedPrompt += `Previous analysis had ${context.previousErrors.length} error(s). `
    optimizedPrompt += `Please pay extra attention to the following areas:\n`

    // Add focus areas
    if (focusAreas.length > 0) {
      optimizedPrompt += `\n## FOCUS AREAS:\n`
      for (const area of focusAreas) {
        optimizedPrompt += `- ${area}\n`
      }
    }

    // Add error corrections
    if (errorCorrections.length > 0) {
      optimizedPrompt += `\n## ERROR CORRECTIONS:\n`
      for (const correction of errorCorrections) {
        optimizedPrompt += `${correction}\n`
      }
    }

    // Add iteration-specific instructions
    if (iterationInstructions) {
      optimizedPrompt += `\n## ITERATION INSTRUCTIONS:\n`
      optimizedPrompt += `${iterationInstructions}\n`
    }

    return {
      optimizedPrompt,
      confidenceThreshold: this.getConfidenceThreshold(
        context.iterationNumber
      ),
      focusAreas,
    }
  }

  /**
   * Identify areas that need extra attention
   */
  private identifyFocusAreas(errors: HandError[]): string[] {
    const focusAreas: string[] = []
    const errorTypes = new Set(errors.map((e) => e.type))

    if (errorTypes.has('duplicate_card' as ErrorType)) {
      focusAreas.push(
        'Card Recognition: Ensure all cards are unique (no duplicates)'
      )
    }

    if (errorTypes.has('invalid_card' as ErrorType)) {
      focusAreas.push(
        'Card Validity: Only use valid ranks (A,K,Q,J,T,9,8,7,6,5,4,3,2) and suits (s,h,d,c)'
      )
    }

    if (errorTypes.has('pot_inconsistency' as ErrorType)) {
      focusAreas.push(
        'Pot Calculation: Carefully verify pot size = SB + BB + (Ante × Players) + All Bets'
      )
    }

    if (errorTypes.has('stack_mismatch' as ErrorType)) {
      focusAreas.push(
        'Stack Tracking: Verify stack_end = stack_start - Ante - Blind - Bets + Winnings'
      )
    }

    if (errorTypes.has('invalid_action_order' as ErrorType)) {
      focusAreas.push(
        'Action Order: Check that players cannot act after folding or going all-in'
      )
    }

    return focusAreas
  }

  /**
   * Generate specific error corrections
   */
  private generateErrorCorrections(errors: HandError[]): string[] {
    const corrections: string[] = []

    for (const error of errors) {
      if (error.suggestedFix) {
        corrections.push(`- ${error.message} → ${error.suggestedFix}`)
      }
    }

    return corrections
  }

  /**
   * Get iteration-specific instructions
   */
  private getIterationInstructions(iterationNumber: number): string {
    switch (iterationNumber) {
      case 1:
        // First iteration: Standard analysis
        return ''

      case 2:
        // Second iteration: More careful
        return `This is the second attempt. Please be extra careful with:
- OCR accuracy (double-check all text)
- Card recognition (verify no duplicates)
- Mathematical calculations (pot sizes, stack changes)`

      case 3:
        // Third iteration: Maximum scrutiny
        return `This is the FINAL attempt. Apply maximum scrutiny:
- Triple-check all OCR results
- Verify every card is valid and unique
- Manually calculate pot sizes and stack changes step-by-step
- If uncertain about any value, prefer to leave it blank rather than guess`

      default:
        return ''
    }
  }

  /**
   * Get recommended confidence threshold for iteration
   */
  getConfidenceThreshold(iterationNumber: number): number {
    switch (iterationNumber) {
      case 1:
        return 0.85 // First pass: accept 85%+

      case 2:
        return 0.90 // Second pass: require 90%+

      case 3:
        return 0.95 // Final pass: require 95%+

      default:
        return 0.85
    }
  }

  /**
   * Determine if we should retry analyzing this hand
   */
  shouldRetry(
    hand: Hand,
    errors: HandError[],
    iterationNumber: number
  ): boolean {
    // Don't retry if already at max iterations
    if (iterationNumber >= 3) {
      return false
    }

    // Retry if confidence is below threshold
    const threshold = this.getConfidenceThreshold(iterationNumber)
    if (hand.confidence < threshold) {
      return true
    }

    // Retry if there are critical or high severity errors
    const hasCriticalErrors = errors.some(
      (e) => e.severity === 'critical' || e.severity === 'high'
    )
    if (hasCriticalErrors) {
      return true
    }

    // Otherwise, no need to retry
    return false
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default PromptOptimizer
