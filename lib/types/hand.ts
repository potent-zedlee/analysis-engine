/**
 * Hand History Type Definitions
 *
 * Complete data structure for a poker hand extracted from video
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Basic Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type Card = string // e.g., "As", "Kh", "Qd", "Jc"
export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'MP+1' | 'CO'
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Player
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Player {
  name: string
  position: Position
  stack_start: number // Starting stack in big blinds
  stack_end: number // Ending stack in big blinds
  hole_cards?: [Card, Card] // Hole cards (if shown)
  is_hero?: boolean // True if this is the featured player
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Action
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Action {
  player: string
  action: ActionType
  amount?: number // Amount in big blinds (for bet/raise/call)
  all_in?: boolean // True if player went all-in
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Street Actions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface StreetActions {
  pot_size_before: number // Pot size before this street (in BB)
  cards?: Card[] // Community cards (for flop/turn/river)
  actions: Action[] // Actions on this street
}

export interface PreflopActions {
  pot_size_before: number // SB + BB + Ante
  actions: Action[]
}

export interface FlopActions extends StreetActions {
  cards: [Card, Card, Card] // 3 flop cards
}

export interface TurnActions extends StreetActions {
  cards: [Card, Card, Card, Card] // 3 flop + 1 turn
}

export interface RiverActions extends StreetActions {
  cards: [Card, Card, Card, Card, Card] // 3 flop + turn + river
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hand Result
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface HandResult {
  winner: string // Winner's name
  pot_final: number // Total pot won (in BB)
  winning_hand?: string // e.g., "Flush", "Two Pair"
  cards_shown?: Record<string, [Card, Card]> // Cards shown at showdown
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blinds
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Blinds {
  sb_amount: number // Small blind (in BB, usually 0.5)
  bb_amount: number // Big blind (always 1.0)
  ante: number // Ante per player (in BB, default 0)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Complete Hand
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Hand {
  // Metadata
  hand_id: string // Unique identifier
  timestamp: number // Video timestamp (seconds)
  video_url?: string // Source video URL
  layout: string // Layout type (e.g., "triton", "hustler")

  // Game info
  blinds: Blinds
  players: Player[]

  // Actions by street
  actions: {
    preflop: Action[]
    flop?: FlopActions
    turn?: TurnActions
    river?: RiverActions
  }

  // Result
  result: HandResult

  // Confidence
  confidence: number // 0.0 - 1.0
  extraction_method: 'gemini_vision' | 'manual' // How this hand was extracted
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default Hand
