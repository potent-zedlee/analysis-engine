/**
 * Unit Tests for Prompt Optimizer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PromptOptimizer } from '../../lib/prompt-optimizer'
import type { IterationContext } from '../../lib/prompt-optimizer'
import type { Hand } from '../../lib/types/hand'
import type { HandError } from '../../lib/types/error'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Fixtures
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BASE_PROMPT = `# MASTER PROMPT
Analyze this poker hand and extract complete hand history.

## INSTRUCTIONS
1. Identify all players
2. Extract hole cards
3. Track all actions
4. Calculate pot sizes`

const SAMPLE_HAND: Hand = {
  hand_id: 'test_1',
  timestamp: 100,
  layout: 'triton',
  blinds: { sb_amount: 0.5, bb_amount: 1.0, ante: 0.1 },
  players: [
    {
      name: 'Player 1',
      position: 'BTN',
      stack_start: 100,
      stack_end: 95,
      hole_cards: ['As', 'Kh'],
    },
  ],
  actions: {
    preflop: [{ player: 'Player 1', action: 'raise', amount: 3 }],
  },
  result: {
    winner: 'Player 1',
    pot_final: 5,
  },
  confidence: 0.80,
  extraction_method: 'gemini_vision',
}

const DUPLICATE_CARD_ERROR: HandError = {
  type: 'duplicate_card',
  handId: 'test_1',
  message: 'Card As appears 2 times',
  severity: 'critical',
  suggestedFix: 'Review OCR for card As in hand #test_1',
  affectedFields: ['players.*.hole_cards'],
}

const POT_ERROR: HandError = {
  type: 'pot_inconsistency',
  handId: 'test_1',
  message: 'Flop pot (10 BB) != Preflop total (7.8 BB)',
  severity: 'high',
  suggestedFix: 'Re-check OCR for pot size at Flop',
  affectedFields: ['actions.flop.pot_size_before'],
}

const STACK_ERROR: HandError = {
  type: 'stack_mismatch',
  handId: 'test_1',
  message: 'Player 1: Expected stack 95.00 BB, got 90 BB (diff: 5.00)',
  severity: 'medium',
  suggestedFix: 'Verify bet amounts and pot calculation',
  affectedFields: ['players[Player 1].stack_end'],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Confidence Thresholds
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('PromptOptimizer - Confidence Thresholds', () => {
  let optimizer: PromptOptimizer

  beforeEach(() => {
    optimizer = new PromptOptimizer()
  })

  it('should return 0.85 for iteration 1', () => {
    expect(optimizer.getConfidenceThreshold(1)).toBe(0.85)
  })

  it('should return 0.90 for iteration 2', () => {
    expect(optimizer.getConfidenceThreshold(2)).toBe(0.90)
  })

  it('should return 0.95 for iteration 3', () => {
    expect(optimizer.getConfidenceThreshold(3)).toBe(0.95)
  })

  it('should default to 0.85 for invalid iteration', () => {
    expect(optimizer.getConfidenceThreshold(0)).toBe(0.85)
    expect(optimizer.getConfidenceThreshold(4)).toBe(0.85)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Retry Decision
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('PromptOptimizer - Retry Decision', () => {
  let optimizer: PromptOptimizer

  beforeEach(() => {
    optimizer = new PromptOptimizer()
  })

  it('should retry if confidence below threshold (iteration 1)', () => {
    const hand = { ...SAMPLE_HAND, confidence: 0.80 } // Below 0.85
    const result = optimizer.shouldRetry(hand, [], 1)
    expect(result).toBe(true)
  })

  it('should not retry if confidence above threshold (iteration 1)', () => {
    const hand = { ...SAMPLE_HAND, confidence: 0.90 } // Above 0.85
    const result = optimizer.shouldRetry(hand, [], 1)
    expect(result).toBe(false)
  })

  it('should retry if there are critical errors', () => {
    const hand = { ...SAMPLE_HAND, confidence: 0.95 } // High confidence
    const result = optimizer.shouldRetry(hand, [DUPLICATE_CARD_ERROR], 1)
    expect(result).toBe(true)
  })

  it('should retry if there are high severity errors', () => {
    const hand = { ...SAMPLE_HAND, confidence: 0.95 }
    const result = optimizer.shouldRetry(hand, [POT_ERROR], 1)
    expect(result).toBe(true)
  })

  it('should not retry if only medium severity errors', () => {
    const hand = { ...SAMPLE_HAND, confidence: 0.95 }
    const result = optimizer.shouldRetry(hand, [STACK_ERROR], 1)
    expect(result).toBe(false)
  })

  it('should not retry if at max iterations', () => {
    const hand = { ...SAMPLE_HAND, confidence: 0.50 } // Low confidence
    const result = optimizer.shouldRetry(hand, [DUPLICATE_CARD_ERROR], 3)
    expect(result).toBe(false)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Prompt Optimization
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('PromptOptimizer - Prompt Optimization', () => {
  let optimizer: PromptOptimizer

  beforeEach(() => {
    optimizer = new PromptOptimizer()
  })

  it('should add iteration number to prompt', () => {
    const context: IterationContext = {
      iterationNumber: 2,
      previousErrors: [],
      previousConfidence: 0.80,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.optimizedPrompt).toContain('ITERATION 2')
    expect(result.optimizedPrompt).toContain('iteration 2 of 3')
  })

  it('should include error count in prompt', () => {
    const context: IterationContext = {
      iterationNumber: 2,
      previousErrors: [DUPLICATE_CARD_ERROR, POT_ERROR],
      previousConfidence: 0.80,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.optimizedPrompt).toContain('2 error(s)')
  })

  it('should identify focus areas for duplicate cards', () => {
    const context: IterationContext = {
      iterationNumber: 2,
      previousErrors: [DUPLICATE_CARD_ERROR],
      previousConfidence: 0.80,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.focusAreas).toContain(
      'Card Recognition: Ensure all cards are unique (no duplicates)'
    )
    expect(result.optimizedPrompt).toContain('FOCUS AREAS:')
    expect(result.optimizedPrompt).toContain('Card Recognition')
  })

  it('should identify focus areas for pot inconsistency', () => {
    const context: IterationContext = {
      iterationNumber: 2,
      previousErrors: [POT_ERROR],
      previousConfidence: 0.80,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.focusAreas).toContain(
      'Pot Calculation: Carefully verify pot size = SB + BB + (Ante × Players) + All Bets'
    )
  })

  it('should include error corrections', () => {
    const context: IterationContext = {
      iterationNumber: 2,
      previousErrors: [DUPLICATE_CARD_ERROR],
      previousConfidence: 0.80,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.optimizedPrompt).toContain('ERROR CORRECTIONS:')
    expect(result.optimizedPrompt).toContain('Card As appears 2 times')
    expect(result.optimizedPrompt).toContain('Review OCR for card As')
  })

  it('should add iteration-specific instructions for iteration 2', () => {
    const context: IterationContext = {
      iterationNumber: 2,
      previousErrors: [],
      previousConfidence: 0.80,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.optimizedPrompt).toContain('ITERATION INSTRUCTIONS:')
    expect(result.optimizedPrompt).toContain('second attempt')
    expect(result.optimizedPrompt).toContain('extra careful')
  })

  it('should add maximum scrutiny instructions for iteration 3', () => {
    const context: IterationContext = {
      iterationNumber: 3,
      previousErrors: [],
      previousConfidence: 0.80,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.optimizedPrompt).toContain('FINAL attempt')
    expect(result.optimizedPrompt).toContain('maximum scrutiny')
    expect(result.optimizedPrompt).toContain('Triple-check')
  })

  it('should not add iteration instructions for iteration 1', () => {
    const context: IterationContext = {
      iterationNumber: 1,
      previousErrors: [],
      previousConfidence: 0.95,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    // Should have base prompt and iteration number, but no special instructions
    expect(result.optimizedPrompt).toContain('ITERATION 1')
    expect(result.optimizedPrompt).not.toContain('ITERATION INSTRUCTIONS:')
  })

  it('should return correct confidence threshold', () => {
    const context: IterationContext = {
      iterationNumber: 2,
      previousErrors: [],
      previousConfidence: 0.80,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.confidenceThreshold).toBe(0.90)
  })

  it('should handle multiple error types', () => {
    const context: IterationContext = {
      iterationNumber: 2,
      previousErrors: [DUPLICATE_CARD_ERROR, POT_ERROR, STACK_ERROR],
      previousConfidence: 0.75,
      handId: 'test_1',
    }

    const result = optimizer.optimizePrompt(BASE_PROMPT, context)

    expect(result.focusAreas.length).toBe(3)
    expect(result.focusAreas).toContain(
      'Card Recognition: Ensure all cards are unique (no duplicates)'
    )
    expect(result.focusAreas).toContain(
      'Pot Calculation: Carefully verify pot size = SB + BB + (Ante × Players) + All Bets'
    )
    expect(result.focusAreas).toContain(
      'Stack Tracking: Verify stack_end = stack_start - Ante - Blind - Bets + Winnings'
    )
  })
})
