/**
 * Error Detection Type Definitions
 *
 * Types for error detection, analysis, and reporting
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export enum ErrorType {
  // OCR Errors (40% of failures)
  OCR_MISREAD = 'ocr_misread', // "10.O8M" instead of "10.08M"
  OCR_MISSING = 'ocr_missing', // Failed to read stack size

  // Card Recognition (25% of failures)
  DUPLICATE_CARD = 'duplicate_card', // Same card appears twice
  INVALID_CARD = 'invalid_card', // Non-existent card (e.g., "14s")

  // Poker Logic (20% of failures)
  POT_INCONSISTENCY = 'pot_inconsistency', // Pot != sum of bets
  STACK_MISMATCH = 'stack_mismatch', // Stack doesn't decrease after bet
  INVALID_ACTION_ORDER = 'invalid_action_order', // BB acts before SB

  // Boundary Detection (10% of failures)
  HAND_OVERLAP = 'hand_overlap', // Hands merged incorrectly
  HAND_SPLIT = 'hand_split', // Single hand split into two

  // Multi-Modal Conflicts (5% of failures)
  VIDEO_OCR_CONFLICT = 'video_ocr_conflict', // Video shows bet, OCR shows check
  AUDIO_OCR_CONFLICT = 'audio_ocr_conflict', // Audio says "3M", OCR says "300K"
}

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface HandError {
  type: ErrorType
  handId: string
  message: string
  severity: ErrorSeverity
  suggestedFix?: string
  affectedFields?: string[] // e.g., ["players.0.stack_start", "actions.preflop.0.amount"]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error Report
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ErrorReport {
  totalErrors: number
  errorsByType: Record<ErrorType, number>
  errorsByHand: Record<string, HandError[]>
  errorsBySeverity: Record<ErrorSeverity, number>
  averageConfidence: number // Average confidence of all hands
  recommendedActions: Recommendation[]
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  action: string
  reason: string
  affectedHands: string[] // Hand IDs
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error Patterns
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface OCRConfusable {
  pattern: string // Regex pattern
  correction: string // Corrected value
  confidence_boost?: number // Boost confidence after correction
  note?: string // Human-readable note
}

export interface InvalidActionSequence {
  invalid: string[] // e.g., ["fold", "bet"]
  reason: string
  suggestedFix: string
}

export interface PotCalculationError {
  symptom: string
  likely_cause: string
  fix: string
}

export interface ErrorPatterns {
  ocr_confusables: OCRConfusable[]
  action_sequences: InvalidActionSequence[]
  pot_calculation_errors: PotCalculationError[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default HandError
