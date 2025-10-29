/**
 * Unit Tests for Templar Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TemplarIntegration } from '../../lib/templar-integration'
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

const INVALID_HAND_NO_PLAYERS: Hand = {
  ...VALID_HAND,
  players: [],
}

const INVALID_HAND_NO_ACTIONS: Hand = {
  ...VALID_HAND,
  actions: {
    preflop: [],
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mock Supabase Client
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let mockSupabaseData: any = {
  hands: [],
  hand_players: [],
  hand_actions: [],
  players: [
    { id: 'player_1_id', name: 'Player 1' },
    { id: 'player_2_id', name: 'Player 2' },
    { id: 'player_3_id', name: 'Player 3' },
  ],
}

const createMockSupabaseClient = () => {
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            if (table === 'players') {
              const player = mockSupabaseData.players.find(
                (p: any) => p.name === value || p.id === value
              )
              return { data: player || null, error: null }
            }
            if (table === 'hands') {
              const hand = mockSupabaseData.hands.find(
                (h: any) => h.day_id === value || h.timestamp === value
              )
              return { data: hand || null, error: null }
            }
            return { data: null, error: null }
          },
        }),
      }),
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: async () => {
            if (table === 'hands') {
              const id = 'hand_id_' + Math.random()
              mockSupabaseData.hands.push({ ...data, id })
              return { data: { id }, error: null }
            }
            if (table === 'players') {
              const id = 'player_id_' + Math.random()
              mockSupabaseData.players.push({ ...data, id })
              return { data: { id }, error: null }
            }
            return { data: null, error: null }
          },
        }),
        async then(callback: any) {
          if (table === 'hand_players') {
            if (Array.isArray(data)) {
              mockSupabaseData.hand_players.push(...data)
            } else {
              mockSupabaseData.hand_players.push(data)
            }
            return callback({ data: null, error: null })
          }
          if (table === 'hand_actions') {
            if (Array.isArray(data)) {
              mockSupabaseData.hand_actions.push(...data)
            } else {
              mockSupabaseData.hand_actions.push(data)
            }
            return callback({ data: null, error: null })
          }
          return callback({ data: null, error: null })
        },
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          async then(callback: any) {
            // Mock rollback
            return callback({ data: null, error: null })
          },
        }),
      }),
    }),
  } as any
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('TemplarIntegration - Validation', () => {
  let integration: TemplarIntegration

  beforeEach(() => {
    mockSupabaseData = {
      hands: [],
      hand_players: [],
      hand_actions: [],
      players: [
        { id: 'player_1_id', name: 'Player 1' },
        { id: 'player_2_id', name: 'Player 2' },
        { id: 'player_3_id', name: 'Player 3' },
      ],
    }
    const mockClient = createMockSupabaseClient()
    integration = new TemplarIntegration(mockClient)
  })

  it('should validate a valid hand', async () => {
    const result = await integration.integrateHands([VALID_HAND], {
      dayId: 'test_day_id',
      validateOnly: true,
    })

    expect(result.success).toBe(true)
    expect(result.handsInserted).toBe(0) // Validation only
    expect(result.handsFailed).toBe(0)
  })

  it('should fail validation if hand has no players', async () => {
    const result = await integration.integrateHands(
      [INVALID_HAND_NO_PLAYERS],
      {
        dayId: 'test_day_id',
        validateOnly: true,
      }
    )

    expect(result.success).toBe(false)
    expect(result.handsFailed).toBe(1)
    expect(result.errors[0].message).toContain('at least one player')
  })

  it('should fail validation if hand has no preflop actions', async () => {
    const result = await integration.integrateHands(
      [INVALID_HAND_NO_ACTIONS],
      {
        dayId: 'test_day_id',
        validateOnly: true,
      }
    )

    expect(result.success).toBe(false)
    expect(result.handsFailed).toBe(1)
    expect(result.errors[0].message).toContain('preflop actions')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('TemplarIntegration - Integration', () => {
  let integration: TemplarIntegration

  beforeEach(() => {
    mockSupabaseData = {
      hands: [],
      hand_players: [],
      hand_actions: [],
      players: [
        { id: 'player_1_id', name: 'Player 1' },
        { id: 'player_2_id', name: 'Player 2' },
        { id: 'player_3_id', name: 'Player 3' },
      ],
    }
    const mockClient = createMockSupabaseClient()
    integration = new TemplarIntegration(mockClient)
  })

  it('should integrate a valid hand', async () => {
    const result = await integration.integrateHands([VALID_HAND], {
      dayId: 'test_day_id',
    })

    expect(result.success).toBe(true)
    expect(result.handsInserted).toBe(1)
    expect(result.handsFailed).toBe(0)
  })

  it('should insert hand into hands table', async () => {
    await integration.integrateHands([VALID_HAND], {
      dayId: 'test_day_id',
    })

    expect(mockSupabaseData.hands.length).toBe(1)
    expect(mockSupabaseData.hands[0].day_id).toBe('test_day_id')
    expect(mockSupabaseData.hands[0].pot_size).toBe(14.8)
  })

  it('should insert hand_players', async () => {
    await integration.integrateHands([VALID_HAND], {
      dayId: 'test_day_id',
    })

    expect(mockSupabaseData.hand_players.length).toBe(3)
    expect(mockSupabaseData.hand_players[0].position).toBe('BTN')
    expect(mockSupabaseData.hand_players[0].cards).toBe('AsKh')
  })

  it('should insert hand_actions', async () => {
    await integration.integrateHands([VALID_HAND], {
      dayId: 'test_day_id',
    })

    expect(mockSupabaseData.hand_actions.length).toBe(6) // 3 preflop + 3 flop
    expect(mockSupabaseData.hand_actions[0].street).toBe('preflop')
    expect(mockSupabaseData.hand_actions[0].action_type).toBe('raise')
    expect(mockSupabaseData.hand_actions[0].sequence).toBe(1)
  })

  it('should generate correct hand description', async () => {
    await integration.integrateHands([VALID_HAND], {
      dayId: 'test_day_id',
    })

    expect(mockSupabaseData.hands[0].description).toContain('Player 1 AsKh')
    expect(mockSupabaseData.hands[0].description).toContain('Player 3 QdJc')
  })

  it('should extract board cards correctly', async () => {
    await integration.integrateHands([VALID_HAND], {
      dayId: 'test_day_id',
    })

    expect(mockSupabaseData.hands[0].board_cards).toBe('Ah Kd Qs')
  })

  it('should integrate multiple hands', async () => {
    const hand2 = { ...VALID_HAND, hand_id: 'test_hand_2' }

    const result = await integration.integrateHands([VALID_HAND, hand2], {
      dayId: 'test_day_id',
    })

    expect(result.success).toBe(true)
    expect(result.handsInserted).toBe(2)
    expect(mockSupabaseData.hands.length).toBe(2)
  })

  it('should handle partial failures', async () => {
    const result = await integration.integrateHands(
      [VALID_HAND, INVALID_HAND_NO_PLAYERS],
      {
        dayId: 'test_day_id',
      }
    )

    expect(result.success).toBe(false)
    expect(result.handsInserted).toBe(1)
    expect(result.handsFailed).toBe(1)
    expect(result.errors.length).toBe(1)
  })
})
