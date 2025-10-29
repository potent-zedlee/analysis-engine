/**
 * Unit Tests for Error Analyzer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ErrorAnalyzer } from '../../lib/error-analyzer'
import type { Hand } from '../../lib/types/hand'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Fixtures
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VALID_HAND: Hand = {
  hand_id: 'test_hand_1',
  timestamp: 100,
  video_url: 'https://youtube.com/watch?v=test123test',
  layout: 'triton',
  blinds: {
    sb_amount: 0.5,
    bb_amount: 1.0,
    ante: 0.1,
  },
  players: [
    {
      name: 'Player 1',
      position: 'BTN',
      stack_start: 100,
      stack_end: 92.9, // 100 - 0.1 (ante) - 3 (preflop) - 4 (flop) = 92.9
      hole_cards: ['As', 'Kh'],
    },
    {
      name: 'Player 2',
      position: 'SB',
      stack_start: 100,
      stack_end: 99.4, // 100 - 0.1 (ante) - 0.5 (SB fold) = 99.4
      hole_cards: ['9d', '8c'],
    },
    {
      name: 'Player 3',
      position: 'BB',
      stack_start: 100,
      stack_end: 107.7, // 100 - 0.1 (ante) - 1.0 (BB) - 2 (call) - 4 (flop) + 14.8 (pot) = 107.7
      hole_cards: ['Qd', 'Jc'],
    },
  ],
  actions: {
    preflop: [
      { player: 'Player 1', action: 'raise', amount: 3 },
      { player: 'Player 2', action: 'fold' },
      { player: 'Player 3', action: 'call', amount: 2 }, // BB calls 2 (already has 1 BB in)
    ],
    flop: {
      pot_size_before: 6.8, // SB (0.5) + BB (1.0) + Ante (0.1*3) + Preflop (3+2) = 6.8 BB
      cards: ['Ah', 'Kd', 'Qs'],
      actions: [
        { player: 'Player 3', action: 'check' },
        { player: 'Player 1', action: 'bet', amount: 4 },
        { player: 'Player 3', action: 'call', amount: 4 },
      ],
    },
  },
  result: {
    winner: 'Player 3',
    pot_final: 14.8, // 6.8 (flop pot) + 4 (P1 bet) + 4 (P3 call) = 14.8 BB
    winning_hand: 'Straight',
  },
  confidence: 0.95,
  extraction_method: 'gemini_vision',
}

const HAND_WITH_DUPLICATE_CARDS: Hand = {
  ...VALID_HAND,
  hand_id: 'test_hand_2',
  players: [
    {
      name: 'Player 1',
      position: 'BTN',
      stack_start: 100,
      stack_end: 90,
      hole_cards: ['As', 'Kh'],
    },
    {
      name: 'Player 2',
      position: 'SB',
      stack_start: 100,
      stack_end: 110,
      hole_cards: ['As', 'Jc'], // As is duplicate
    },
  ],
}

const HAND_WITH_INVALID_CARDS: Hand = {
  ...VALID_HAND,
  hand_id: 'test_hand_3',
  players: [
    {
      name: 'Player 1',
      position: 'BTN',
      stack_start: 100,
      stack_end: 90,
      hole_cards: ['Zs', 'Kh'], // Zs is invalid
    },
    {
      name: 'Player 2',
      position: 'SB',
      stack_start: 100,
      stack_end: 110,
      hole_cards: ['Qd', '14c'], // 14c is invalid
    },
  ],
}

const HAND_WITH_POT_INCONSISTENCY: Hand = {
  ...VALID_HAND,
  hand_id: 'test_hand_4',
  actions: {
    preflop: [
      { player: 'Player 2', action: 'call', amount: 0.5 },
      { player: 'Player 1', action: 'raise', amount: 3 },
      { player: 'Player 2', action: 'call', amount: 2.5 },
    ],
    flop: {
      pot_size_before: 10.0, // Should be 7.8, not 10.0 (3 players: SB + BB + Ante + Actions)
      cards: ['Ah', 'Kd', 'Qs'],
      actions: [
        { player: 'Player 2', action: 'check' },
        { player: 'Player 1', action: 'bet', amount: 4 },
        { player: 'Player 2', action: 'call', amount: 4 },
      ],
    },
  },
}

const HAND_WITH_STACK_MISMATCH: Hand = {
  ...VALID_HAND,
  hand_id: 'test_hand_5',
  players: [
    {
      name: 'Player 1',
      position: 'BTN',
      stack_start: 100,
      stack_end: 100, // Should be 90, not 100
      hole_cards: ['As', 'Kh'],
    },
    {
      name: 'Player 2',
      position: 'SB',
      stack_start: 100,
      stack_end: 109.8,
      hole_cards: ['Qd', 'Jc'],
    },
  ],
}

const HAND_WITH_INVALID_ACTION_ORDER: Hand = {
  ...VALID_HAND,
  hand_id: 'test_hand_6',
  actions: {
    preflop: [
      { player: 'Player 2', action: 'fold' },
      { player: 'Player 2', action: 'bet', amount: 3 }, // Cannot bet after folding
    ],
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Valid Hand
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Valid Hand', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should find no errors in valid hand', async () => {
    const report = await analyzer.analyzeHands([VALID_HAND])

    expect(report.totalErrors).toBe(0)
    expect(report.averageConfidence).toBe(0.95)
    expect(report.recommendedActions.length).toBe(0)
  })

  it('should calculate average confidence correctly', async () => {
    const hands = [
      { ...VALID_HAND, confidence: 0.9 },
      { ...VALID_HAND, confidence: 0.8 },
      { ...VALID_HAND, confidence: 0.7 },
    ]

    const report = await analyzer.analyzeHands(hands)
    expect(report.averageConfidence).toBeCloseTo(0.8, 2)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Duplicate Cards
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Duplicate Cards', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should detect duplicate cards', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_DUPLICATE_CARDS])

    expect(report.totalErrors).toBeGreaterThan(0)
    expect(report.errorsByType.duplicate_card).toBe(1)
  })

  it('should mark duplicate card errors as critical', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_DUPLICATE_CARDS])

    expect(report.errorsBySeverity.critical).toBeGreaterThan(0)
  })

  it('should include card name in error message', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_DUPLICATE_CARDS])

    const duplicateError = Object.values(report.errorsByHand)[0][0]
    expect(duplicateError.message).toContain('As')
    expect(duplicateError.message).toContain('appears')
  })

  it('should suggest OCR review', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_DUPLICATE_CARDS])

    const duplicateError = Object.values(report.errorsByHand)[0][0]
    expect(duplicateError.suggestedFix).toContain('Review OCR')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Invalid Cards
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Invalid Cards', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should detect invalid card ranks', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_INVALID_CARDS])

    expect(report.errorsByType.invalid_card).toBeGreaterThan(0)
  })

  it('should detect multiple invalid cards', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_INVALID_CARDS])

    // Zs (invalid rank) and 14c (invalid rank)
    expect(report.errorsByType.invalid_card).toBeGreaterThanOrEqual(2)
  })

  it('should mark invalid card errors as critical', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_INVALID_CARDS])

    expect(report.errorsBySeverity.critical).toBeGreaterThan(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Pot Inconsistency
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Pot Inconsistency', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should detect pot inconsistency', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_POT_INCONSISTENCY])

    expect(report.errorsByType.pot_inconsistency).toBe(1)
  })

  it('should mark pot inconsistency as high severity', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_POT_INCONSISTENCY])

    expect(report.errorsBySeverity.high).toBeGreaterThan(0)
  })

  it('should include pot values in error message', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_POT_INCONSISTENCY])

    const potError = Object.values(report.errorsByHand)[0][0]
    expect(potError.message).toContain('10')
    expect(potError.message).toContain('7.8') // 3 players: SB(0.5) + BB(1.0) + Ante(0.3) + Actions(6.0) = 7.8
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Stack Mismatch
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Stack Mismatch', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should detect stack mismatch', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_STACK_MISMATCH])

    expect(report.errorsByType.stack_mismatch).toBeGreaterThanOrEqual(1)
  })

  it('should mark stack mismatch as medium severity', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_STACK_MISMATCH])

    expect(report.errorsBySeverity.medium).toBeGreaterThan(0)
  })

  it('should include player name in error message', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_STACK_MISMATCH])

    // Find the stack mismatch error
    const allErrors = Object.values(report.errorsByHand)[0]
    const stackError = allErrors.find(e => e.type === 'stack_mismatch')
    expect(stackError).toBeDefined()
    expect(stackError?.message).toContain('Player')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Invalid Action Order
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Invalid Action Order', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should detect invalid action order', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_INVALID_ACTION_ORDER])

    expect(report.errorsByType.invalid_action_order).toBe(1)
  })

  it('should mark invalid action order as high severity', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_INVALID_ACTION_ORDER])

    expect(report.errorsBySeverity.high).toBeGreaterThan(0)
  })

  it('should include player name and actions in error message', async () => {
    const report = await analyzer.analyzeHands([HAND_WITH_INVALID_ACTION_ORDER])

    // Find the invalid action order error
    const allErrors = Object.values(report.errorsByHand)[0]
    const actionError = allErrors.find(e => e.type === 'invalid_action_order')
    expect(actionError).toBeDefined()
    expect(actionError?.message).toContain('Player 2')
    expect(actionError?.message).toContain('fold')
    expect(actionError?.message).toContain('bet')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Multiple Hands
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Multiple Hands', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should analyze multiple hands', async () => {
    const hands = [
      VALID_HAND,
      HAND_WITH_DUPLICATE_CARDS,
      HAND_WITH_INVALID_CARDS,
    ]

    const report = await analyzer.analyzeHands(hands)

    expect(report.totalErrors).toBeGreaterThan(0)
    expect(Object.keys(report.errorsByHand).length).toBeGreaterThanOrEqual(2) // At least 2 hands with errors
  })

  it('should group errors by hand', async () => {
    const hands = [
      HAND_WITH_DUPLICATE_CARDS,
      HAND_WITH_POT_INCONSISTENCY,
    ]

    const report = await analyzer.analyzeHands(hands)

    expect(report.errorsByHand['test_hand_2']).toBeDefined()
    expect(report.errorsByHand['test_hand_4']).toBeDefined()
  })

  it('should group errors by type', async () => {
    const hands = [
      HAND_WITH_DUPLICATE_CARDS,
      HAND_WITH_INVALID_CARDS,
    ]

    const report = await analyzer.analyzeHands(hands)

    expect(report.errorsByType.duplicate_card).toBeGreaterThan(0)
    expect(report.errorsByType.invalid_card).toBeGreaterThan(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Recommendations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Recommendations', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should recommend re-analysis for many duplicate cards', async () => {
    const hands = [
      { ...HAND_WITH_DUPLICATE_CARDS, hand_id: 'h1' },
      { ...HAND_WITH_DUPLICATE_CARDS, hand_id: 'h2' },
      { ...HAND_WITH_DUPLICATE_CARDS, hand_id: 'h3' },
    ]

    const report = await analyzer.analyzeHands(hands)

    const recommendation = report.recommendedActions.find((r) =>
      r.action.includes('card recognition')
    )
    expect(recommendation).toBeDefined()
    expect(recommendation?.priority).toBe('high')
  })

  it('should recommend pot calculation fix for many inconsistencies', async () => {
    const hands = [
      { ...HAND_WITH_POT_INCONSISTENCY, hand_id: 'h1' },
      { ...HAND_WITH_POT_INCONSISTENCY, hand_id: 'h2' },
      { ...HAND_WITH_POT_INCONSISTENCY, hand_id: 'h3' },
      { ...HAND_WITH_POT_INCONSISTENCY, hand_id: 'h4' },
    ]

    const report = await analyzer.analyzeHands(hands)

    const recommendation = report.recommendedActions.find((r) =>
      r.action.includes('pot calculation')
    )
    expect(recommendation).toBeDefined()
    expect(recommendation?.priority).toBe('high')
  })

  it('should recommend iteration for low confidence', async () => {
    const hands = [
      { ...VALID_HAND, confidence: 0.6, hand_id: 'h1' },
      { ...VALID_HAND, confidence: 0.7, hand_id: 'h2' },
      { ...VALID_HAND, confidence: 0.5, hand_id: 'h3' },
    ]

    const report = await analyzer.analyzeHands(hands)

    const recommendation = report.recommendedActions.find((r) =>
      r.action.includes('iteration')
    )
    expect(recommendation).toBeDefined()
  })

  it('should recommend manual review for many critical errors', async () => {
    const hands = [
      { ...HAND_WITH_DUPLICATE_CARDS, hand_id: 'h1' },
      { ...HAND_WITH_DUPLICATE_CARDS, hand_id: 'h2' },
      { ...HAND_WITH_INVALID_CARDS, hand_id: 'h3' },
      { ...HAND_WITH_INVALID_CARDS, hand_id: 'h4' },
      { ...HAND_WITH_INVALID_CARDS, hand_id: 'h5' },
      { ...HAND_WITH_INVALID_CARDS, hand_id: 'h6' },
    ]

    const report = await analyzer.analyzeHands(hands)

    const recommendation = report.recommendedActions.find((r) =>
      r.action.includes('Manual review')
    )
    expect(recommendation).toBeDefined()
    expect(recommendation?.priority).toBe('high')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Empty Input
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ErrorAnalyzer - Empty Input', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    analyzer = new ErrorAnalyzer()
  })

  it('should handle empty hands array', async () => {
    const report = await analyzer.analyzeHands([])

    expect(report.totalErrors).toBe(0)
    expect(report.averageConfidence).toBe(0)
    expect(report.recommendedActions.length).toBe(0)
  })
})
