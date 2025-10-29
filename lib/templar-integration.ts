/**
 * Templar Archives Integration
 *
 * Integrates hand analysis results with Templar Archives database.
 * Transforms Hand → Supabase schema and inserts into:
 * - hands
 * - hand_players
 * - hand_actions
 */

import type { Hand, Player } from './types/hand.js'
import type { SupabaseClient } from '@supabase/supabase-js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface IntegrationOptions {
  dayId: string // UUID of the day (video) in Templar Archives
  skipDuplicates?: boolean // If true, skip hands that already exist
  validateOnly?: boolean // If true, only validate without inserting
}

export interface IntegrationResult {
  success: boolean
  handsInserted: number
  handsFailed: number
  errors: IntegrationError[]
}

export interface IntegrationError {
  handId: string
  message: string
  error?: any
}

interface SupabaseHand {
  id?: string
  day_id: string
  number: string
  description: string
  timestamp: string
  pot_size?: number
  board_cards?: string
  favorite?: boolean
}

interface SupabaseHandPlayer {
  hand_id: string
  player_id: string
  position: string
  cards?: string
  starting_stack?: number
  ending_stack?: number
}

interface SupabaseHandAction {
  hand_id: string
  player_id: string
  street: 'preflop' | 'flop' | 'turn' | 'river'
  action_type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  amount?: number
  sequence: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Templar Integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class TemplarIntegration {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Integrate multiple hands into Templar Archives
   */
  async integrateHands(
    hands: Hand[],
    options: IntegrationOptions
  ): Promise<IntegrationResult> {
    const result: IntegrationResult = {
      success: true,
      handsInserted: 0,
      handsFailed: 0,
      errors: [],
    }

    for (const hand of hands) {
      try {
        if (options.validateOnly) {
          // Validate only
          this.validateHand(hand)
        } else {
          // Insert hand
          await this.integrateHand(hand, options.dayId, options.skipDuplicates)
          result.handsInserted++
        }
      } catch (error: any) {
        result.handsFailed++
        result.errors.push({
          handId: hand.hand_id,
          message: error.message || 'Unknown error',
          error,
        })
        result.success = false
      }
    }

    return result
  }

  /**
   * Integrate a single hand into Templar Archives
   */
  private async integrateHand(
    hand: Hand,
    dayId: string,
    skipDuplicates: boolean = false
  ): Promise<void> {
    // 1. Validate hand
    this.validateHand(hand)

    // 2. Check if hand already exists
    if (skipDuplicates) {
      const { data: existing } = await this.supabase
        .from('hands')
        .select('id')
        .eq('day_id', dayId)
        .eq('timestamp', hand.timestamp.toString())
        .single()

      if (existing) {
        console.log(`Hand ${hand.hand_id} already exists, skipping`)
        return
      }
    }

    // 3. Get or create players
    const playerIdMap = await this.getOrCreatePlayers(hand.players)

    // 4. Transform hand to Supabase schema
    const supabaseHand = this.transformHandToSupabase(hand, dayId)

    // 5. Insert hand (transaction)
    const { data: insertedHand, error: handError } = await this.supabase
      .from('hands')
      .insert(supabaseHand)
      .select('id')
      .single()

    if (handError || !insertedHand) {
      throw new Error(`Failed to insert hand: ${handError?.message}`)
    }

    const handId = insertedHand.id

    // 6. Insert hand_players
    const handPlayers = this.transformHandPlayersToSupabase(
      hand,
      handId,
      playerIdMap
    )

    const { error: playersError } = await this.supabase
      .from('hand_players')
      .insert(handPlayers)

    if (playersError) {
      // Rollback: delete hand
      await this.supabase.from('hands').delete().eq('id', handId)
      throw new Error(
        `Failed to insert hand_players: ${playersError.message}`
      )
    }

    // 7. Insert hand_actions
    const handActions = this.transformHandActionsToSupabase(
      hand,
      handId,
      playerIdMap
    )

    if (handActions.length > 0) {
      const { error: actionsError } = await this.supabase
        .from('hand_actions')
        .insert(handActions)

      if (actionsError) {
        // Rollback: delete hand_players and hand
        await this.supabase.from('hand_players').delete().eq('hand_id', handId)
        await this.supabase.from('hands').delete().eq('id', handId)
        throw new Error(
          `Failed to insert hand_actions: ${actionsError.message}`
        )
      }
    }
  }

  /**
   * Validate hand before integration
   */
  private validateHand(hand: Hand): void {
    if (!hand.hand_id) {
      throw new Error('Hand ID is required')
    }

    if (!hand.players || hand.players.length === 0) {
      throw new Error('Hand must have at least one player')
    }

    if (!hand.actions || !hand.actions.preflop || hand.actions.preflop.length === 0) {
      throw new Error('Hand must have preflop actions')
    }

    // Validate players
    for (const player of hand.players) {
      if (!player.name) {
        throw new Error(`Player ${player.position} has no name`)
      }
      if (!player.position) {
        throw new Error(`Player ${player.name} has no position`)
      }
    }
  }

  /**
   * Get or create players in database
   */
  private async getOrCreatePlayers(
    players: Player[]
  ): Promise<Map<string, string>> {
    const playerIdMap = new Map<string, string>()

    for (const player of players) {
      // Check if player exists
      const { data: existing } = await this.supabase
        .from('players')
        .select('id')
        .eq('name', player.name)
        .single()

      if (existing) {
        playerIdMap.set(player.name, existing.id)
      } else {
        // Create new player
        const { data: newPlayer, error } = await this.supabase
          .from('players')
          .insert({
            name: player.name,
            country: null,
            photo_url: null,
            total_winnings: 0,
          })
          .select('id')
          .single()

        if (error || !newPlayer) {
          throw new Error(
            `Failed to create player ${player.name}: ${error?.message}`
          )
        }

        playerIdMap.set(player.name, newPlayer.id)
      }
    }

    return playerIdMap
  }

  /**
   * Transform Hand to Supabase hands table schema
   */
  private transformHandToSupabase(
    hand: Hand,
    dayId: string
  ): SupabaseHand {
    // Generate description from players and actions
    const description = this.generateHandDescription(hand)

    // Extract board cards
    const boardCards = this.extractBoardCards(hand)

    return {
      day_id: dayId,
      number: hand.hand_id,
      description,
      timestamp: hand.timestamp.toString(),
      pot_size: hand.result.pot_final,
      board_cards: boardCards,
      favorite: false,
    }
  }

  /**
   * Generate hand description (e.g., "Player 1 AA / Player 2 KK")
   */
  private generateHandDescription(hand: Hand): string {
    const descriptions: string[] = []

    for (const player of hand.players) {
      if (player.hole_cards) {
        const cards = player.hole_cards.join('')
        descriptions.push(`${player.name} ${cards}`)
      }
    }

    return descriptions.join(' / ')
  }

  /**
   * Extract board cards from hand
   */
  private extractBoardCards(hand: Hand): string | undefined {
    const cards: string[] = []

    if (hand.actions.flop) {
      cards.push(...hand.actions.flop.cards)
    }

    if (hand.actions.turn && hand.actions.turn.cards.length > 3) {
      cards.push(hand.actions.turn.cards[3])
    }

    if (hand.actions.river && hand.actions.river.cards.length > 4) {
      cards.push(hand.actions.river.cards[4])
    }

    return cards.length > 0 ? cards.join(' ') : undefined
  }

  /**
   * Transform Hand Players to Supabase hand_players table schema
   */
  private transformHandPlayersToSupabase(
    hand: Hand,
    handId: string,
    playerIdMap: Map<string, string>
  ): SupabaseHandPlayer[] {
    return hand.players.map((player: Player) => ({
      hand_id: handId,
      player_id: playerIdMap.get(player.name)!,
      position: player.position,
      cards: player.hole_cards?.join('') || undefined,
      starting_stack: player.stack_start,
      ending_stack: player.stack_end,
    }))
  }

  /**
   * Transform Hand Actions to Supabase hand_actions table schema
   */
  private transformHandActionsToSupabase(
    hand: Hand,
    handId: string,
    playerIdMap: Map<string, string>
  ): SupabaseHandAction[] {
    const actions: SupabaseHandAction[] = []
    let sequence = 1

    // Preflop
    for (const action of hand.actions.preflop) {
      actions.push({
        hand_id: handId,
        player_id: playerIdMap.get(action.player)!,
        street: 'preflop',
        action_type: action.action as any,
        amount: action.amount,
        sequence: sequence++,
      })
    }

    // Flop
    if (hand.actions.flop) {
      for (const action of hand.actions.flop.actions) {
        actions.push({
          hand_id: handId,
          player_id: playerIdMap.get(action.player)!,
          street: 'flop',
          action_type: action.action as any,
          amount: action.amount,
          sequence: sequence++,
        })
      }
    }

    // Turn
    if (hand.actions.turn) {
      for (const action of hand.actions.turn.actions) {
        actions.push({
          hand_id: handId,
          player_id: playerIdMap.get(action.player)!,
          street: 'turn',
          action_type: action.action as any,
          amount: action.amount,
          sequence: sequence++,
        })
      }
    }

    // River
    if (hand.actions.river) {
      for (const action of hand.actions.river.actions) {
        actions.push({
          hand_id: handId,
          player_id: playerIdMap.get(action.player)!,
          street: 'river',
          action_type: action.action as any,
          amount: action.amount,
          sequence: sequence++,
        })
      }
    }

    return actions
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default TemplarIntegration
