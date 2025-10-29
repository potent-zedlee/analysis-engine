/**
 * Unit Tests for Hand Analyzer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandAnalyzer } from '../../src/core/hand-analyzer'
import type { Hand } from '../../lib/types/hand'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Fixtures
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VALID_HAND: Hand = {
  hand_id: 'test_hand_1',
  timestamp: 100,
  video_url: 'https://youtube.com/watch?v=test',
  layout: 'triton',
  blinds: { sb_amount: 0.5, bb_amount: 1.0, ante: 0.1 },
  players: [
    {
      name: 'Player 1',
      position: 'BTN',
      stack_start: 100,
      stack_end: 92.9,
      hole_cards: ['As', 'Kh'],
    },
    {
      name: 'Player 2',
      position: 'SB',
      stack_start: 100,
      stack_end: 99.4,
      hole_cards: ['9d', '8c'],
    },
    {
      name: 'Player 3',
      position: 'BB',
      stack_start: 100,
      stack_end: 107.7,
      hole_cards: ['Qd', 'Jc'],
    },
  ],
  actions: {
    preflop: [
      { player: 'Player 1', action: 'raise', amount: 3 },
      { player: 'Player 2', action: 'fold' },
      { player: 'Player 3', action: 'call', amount: 2 },
    ],
    flop: {
      pot_size_before: 6.8,
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
    pot_final: 14.8,
    winning_hand: 'Straight',
  },
  confidence: 0.95,
  extraction_method: 'gemini_vision',
}

const LOW_CONFIDENCE_HAND: Hand = {
  ...VALID_HAND,
  hand_id: 'test_hand_2',
  confidence: 0.75, // Below iteration 1 threshold (0.85)
}

const HAND_WITH_CRITICAL_ERROR: Hand = {
  ...VALID_HAND,
  hand_id: 'test_hand_3',
  players: [
    {
      name: 'Player 1',
      position: 'BTN',
      stack_start: 100,
      stack_end: 95,
      hole_cards: ['As', 'As'], // Duplicate card (critical error)
    },
  ],
  confidence: 0.90, // High confidence but has critical error
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mock Setup
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Mock analysis results (shared state)
let mockAnalysisResults: Hand[] = []
let mockAnalysisCallCount = 0

// Mock the boundary detector
vi.mock('../../lib/detectors/hand-boundary-detector', () => {
  class MockHandBoundaryDetector {
    async detectHandBoundaries() {
      return [
        { startTime: '00:00:10', endTime: '00:01:30', confidence: 0.95 },
        { startTime: '00:02:00', endTime: '00:03:20', confidence: 0.92 },
      ]
    }
  }

  return { HandBoundaryDetector: MockHandBoundaryDetector }
})

// Mock the Gemini client
vi.mock('../../lib/gemini-client', () => {
  class MockGeminiClient {
    async analyzeHandSequence() {
      const result = mockAnalysisResults[mockAnalysisCallCount % mockAnalysisResults.length]
      mockAnalysisCallCount++
      return result
    }
  }

  return { GeminiClient: MockGeminiClient }
})

// Mock the Master Prompt Builder
vi.mock('../../lib/master-prompt-builder', () => {
  class MockMasterPromptBuilder {
    buildForLayout() {
      return 'MOCK MASTER PROMPT'
    }
  }

  return { MasterPromptBuilder: MockMasterPromptBuilder }
})

// Mock the Error Analyzer
vi.mock('../../lib/error-analyzer', () => {
  class MockErrorAnalyzer {
    async analyzeHands(hands: Hand[]) {
      const errors = []

      // Check for duplicate cards (critical error)
      for (const hand of hands) {
        for (const player of hand.players) {
          if (player.hole_cards && player.hole_cards[0] === player.hole_cards[1]) {
            errors.push({
              type: 'duplicate_card',
              handId: hand.hand_id,
              message: `Card ${player.hole_cards[0]} appears 2 times`,
              severity: 'critical',
            })
          }
        }
      }

      return {
        totalErrors: errors.length,
        errorsByType: {},
        errorsByHand: { [hands[0].hand_id]: errors },
        errorsBySeverity: { critical: errors.length },
        averageConfidence: hands[0].confidence,
        recommendedActions: [],
      }
    }
  }

  return { ErrorAnalyzer: MockErrorAnalyzer }
})

// Mock the Prompt Optimizer
vi.mock('../../lib/prompt-optimizer', () => {
  class MockPromptOptimizer {
    optimizePrompt(basePrompt: string) {
      return {
        optimizedPrompt: basePrompt + ' (OPTIMIZED)',
        confidenceThreshold: 0.90,
        focusAreas: [],
      }
    }

    getConfidenceThreshold(iteration: number) {
      if (iteration === 1) return 0.85
      if (iteration === 2) return 0.90
      return 0.95
    }

    shouldRetry(hand: Hand, errors: any[], iteration: number) {
      if (iteration >= 3) return false
      if (hand.confidence < this.getConfidenceThreshold(iteration)) return true
      if (errors.some((e) => e.severity === 'critical' || e.severity === 'high')) return true
      return false
    }
  }

  return { PromptOptimizer: MockPromptOptimizer }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Basic Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HandAnalyzer - Basic Analysis', () => {
  let analyzer: HandAnalyzer

  beforeEach(() => {
    analyzer = new HandAnalyzer('fake-api-key')
    mockAnalysisResults = []
    mockAnalysisCallCount = 0
  })

  it('should create analyzer instance', () => {
    expect(analyzer).toBeDefined()
  })

  it('should require either videoUrl or videoPath', async () => {
    await expect(analyzer.analyzeVideo({})).rejects.toThrow(
      'Either videoUrl or videoPath must be provided'
    )
  })

  it('should analyze video with valid hands', async () => {
    mockAnalysisResults = [VALID_HAND, VALID_HAND]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
      layout: 'triton',
    })

    expect(result.totalHands).toBe(2)
    expect(result.hands.length).toBe(2)
    expect(result.successfulHands).toBe(2)
    expect(result.failedHands).toBe(0)
    expect(result.averageConfidence).toBe(0.95)
  })

  it('should calculate processing time', async () => {
    mockAnalysisResults = [VALID_HAND]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
    })

    expect(result.processingTime).toBeGreaterThanOrEqual(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Iteration Logic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HandAnalyzer - Iteration Logic', () => {
  let analyzer: HandAnalyzer

  beforeEach(() => {
    analyzer = new HandAnalyzer('fake-api-key')
    mockAnalysisResults = []
    mockAnalysisCallCount = 0
  })

  it('should not iterate if hand has high confidence and no errors', async () => {
    mockAnalysisResults = [VALID_HAND, VALID_HAND]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
      maxIterations: 3,
    })

    // Should only call once per hand (no retries)
    expect(mockAnalysisCallCount).toBe(2)
    expect(result.totalIterations).toBe(2) // 1 iteration per hand
  })

  it('should iterate if hand has low confidence', async () => {
    // First attempt: low confidence (0.75 < 0.85)
    // Second attempt: improved confidence (0.90 > 0.90)
    mockAnalysisResults = [
      LOW_CONFIDENCE_HAND,
      { ...LOW_CONFIDENCE_HAND, confidence: 0.90 },
    ]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
      maxIterations: 3,
    })

    // Should iterate once (2 attempts total)
    expect(mockAnalysisCallCount).toBeGreaterThan(2)
    expect(result.totalIterations).toBeGreaterThan(2)
  })

  it('should iterate if hand has critical errors', async () => {
    // First attempt: critical error (duplicate card)
    // Second attempt: fixed
    mockAnalysisResults = [HAND_WITH_CRITICAL_ERROR, VALID_HAND]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
      maxIterations: 3,
    })

    // Should iterate at least once
    expect(mockAnalysisCallCount).toBeGreaterThan(2)
  })

  it('should stop at max iterations', async () => {
    // Always return low confidence (will keep retrying)
    mockAnalysisResults = [LOW_CONFIDENCE_HAND]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
      maxIterations: 3,
    })

    // Should stop at 3 iterations per hand
    // 2 hands × 3 iterations = 6 total calls
    expect(mockAnalysisCallCount).toBe(6)
    expect(result.totalIterations).toBe(6)
  })

  it('should use default max iterations of 3', async () => {
    mockAnalysisResults = [LOW_CONFIDENCE_HAND]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
      // No maxIterations specified, should default to 3
    })

    // Should use default of 3 iterations
    expect(mockAnalysisCallCount).toBe(6) // 2 hands × 3 iterations
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Metrics Calculation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HandAnalyzer - Metrics Calculation', () => {
  let analyzer: HandAnalyzer

  beforeEach(() => {
    analyzer = new HandAnalyzer('fake-api-key')
    mockAnalysisResults = []
    mockAnalysisCallCount = 0
  })

  it('should count successful hands correctly', async () => {
    mockAnalysisResults = [
      { ...VALID_HAND, confidence: 0.95 }, // Hand 1: Success on first try
      { ...VALID_HAND, confidence: 0.70 }, // Hand 2: Will retry...
      { ...VALID_HAND, confidence: 0.90 }, // Hand 2: Success on second try
    ]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
    })

    // Both hands should succeed (one immediately, one after iteration)
    expect(result.successfulHands).toBe(2)
    expect(result.failedHands).toBe(0)
  })

  it('should calculate average confidence correctly', async () => {
    mockAnalysisResults = [
      { ...VALID_HAND, confidence: 0.90 },
      { ...VALID_HAND, confidence: 0.90 },
    ]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
    })

    expect(result.averageConfidence).toBe(0.90)
  })

  it('should count total iterations', async () => {
    // First hand: 1 iteration (high confidence)
    // Second hand: 3 iterations (always low confidence)
    mockAnalysisResults = [
      VALID_HAND, // Hand 1, iteration 1 (success)
      LOW_CONFIDENCE_HAND, // Hand 2, iteration 1
      LOW_CONFIDENCE_HAND, // Hand 2, iteration 2
      LOW_CONFIDENCE_HAND, // Hand 2, iteration 3
    ]

    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=test',
      maxIterations: 3,
    })

    expect(result.totalIterations).toBe(4) // 1 + 3
  })
})
