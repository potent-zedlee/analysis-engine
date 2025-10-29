/**
 * Error Analyzer
 *
 * Detects and analyzes errors in extracted hand histories
 * Provides recommendations for error correction and iteration
 */

import type {
  Hand,
  Action,
  Card,
} from './types/hand.js'
import type {
  ErrorType,
  HandError,
  ErrorReport,
  Recommendation,
  ErrorSeverity,
} from './types/error.js'
import { promises as fs } from 'fs'
import path from 'path'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error Analyzer Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class ErrorAnalyzer {
  private errorPatterns: any = null

  /**
   * Analyze hands for errors
   */
  async analyzeHands(hands: Hand[]): Promise<ErrorReport> {
    // Load error patterns if not loaded
    if (!this.errorPatterns) {
      await this.loadErrorPatterns()
    }

    const errors: HandError[] = []

    for (const hand of hands) {
      // Check 1: Duplicate cards
      errors.push(...this.checkDuplicateCards(hand))

      // Check 2: Pot consistency
      errors.push(...this.checkPotConsistency(hand))

      // Check 3: Stack decreases
      errors.push(...this.checkStackConsistency(hand))

      // Check 4: Action order
      errors.push(...this.checkActionOrder(hand))

      // Check 5: Card validity
      errors.push(...this.checkCardValidity(hand))
    }

    return {
      totalErrors: errors.length,
      errorsByType: this.groupErrorsByType(errors),
      errorsByHand: this.groupErrorsByHand(errors),
      errorsBySeverity: this.groupErrorsBySeverity(errors),
      averageConfidence: this.calculateAverageConfidence(hands),
      recommendedActions: this.generateRecommendations(errors, hands),
    }
  }

  /**
   * Check for duplicate cards across all players and board
   */
  private checkDuplicateCards(hand: Hand): HandError[] {
    const allCards: Card[] = []

    // Collect all hole cards
    for (const player of hand.players) {
      if (player.hole_cards) {
        allCards.push(...player.hole_cards)
      }
    }

    // Collect board cards
    if (hand.actions.flop?.cards) {
      allCards.push(...hand.actions.flop.cards)
    }
    if (hand.actions.turn?.cards) {
      // Turn cards include flop, so only add the 4th card
      const turnCard = hand.actions.turn.cards[3]
      if (turnCard && !allCards.includes(turnCard)) {
        allCards.push(turnCard)
      }
    }
    if (hand.actions.river?.cards) {
      // River cards include flop + turn, so only add the 5th card
      const riverCard = hand.actions.river.cards[4]
      if (riverCard && !allCards.includes(riverCard)) {
        allCards.push(riverCard)
      }
    }

    // Count card occurrences
    const cardCounts = new Map<string, number>()
    for (const card of allCards) {
      cardCounts.set(card, (cardCounts.get(card) || 0) + 1)
    }

    // Find duplicates
    const duplicates = Array.from(cardCounts.entries()).filter(
      ([_, count]) => count > 1
    )

    return duplicates.map(([card, count]) => ({
      type: 'duplicate_card' as ErrorType,
      handId: hand.hand_id,
      message: `Card ${card} appears ${count} times`,
      severity: 'critical' as ErrorSeverity,
      suggestedFix: `Review OCR for card ${card} in hand #${hand.hand_id}`,
      affectedFields: ['players.*.hole_cards', 'actions.*.cards'],
    }))
  }

  /**
   * Check pot consistency across streets
   */
  private checkPotConsistency(hand: Hand): HandError[] {
    const errors: HandError[] = []

    // Calculate preflop pot
    const preflopPot =
      hand.blinds.sb_amount +
      hand.blinds.bb_amount +
      hand.blinds.ante * hand.players.length +
      hand.actions.preflop.reduce(
        (sum: number, a: Action) => sum + (a.amount || 0),
        0
      )

    // Check flop pot
    if (hand.actions.flop) {
      const potDiff = Math.abs(
        hand.actions.flop.pot_size_before - preflopPot
      )
      if (potDiff > 0.1) {
        // Allow 0.1 BB tolerance
        errors.push({
          type: 'pot_inconsistency' as ErrorType,
          handId: hand.hand_id,
          message: `Flop pot (${hand.actions.flop.pot_size_before} BB) != Preflop total (${preflopPot.toFixed(2)} BB)`,
          severity: 'high' as ErrorSeverity,
          suggestedFix: 'Re-check OCR for pot size at Flop',
          affectedFields: ['actions.flop.pot_size_before', 'actions.preflop'],
        })
      }
    }

    // Check turn pot
    if (hand.actions.flop && hand.actions.turn) {
      const flopPotAfter =
        hand.actions.flop.pot_size_before +
        hand.actions.flop.actions.reduce((sum: number, a: Action) => sum + (a.amount || 0), 0)
      const potDiff = Math.abs(
        hand.actions.turn.pot_size_before - flopPotAfter
      )
      if (potDiff > 0.1) {
        errors.push({
          type: 'pot_inconsistency' as ErrorType,
          handId: hand.hand_id,
          message: `Turn pot (${hand.actions.turn.pot_size_before} BB) != Flop total (${flopPotAfter.toFixed(2)} BB)`,
          severity: 'high' as ErrorSeverity,
          suggestedFix: 'Re-check OCR for pot size at Turn',
          affectedFields: ['actions.turn.pot_size_before', 'actions.flop'],
        })
      }
    }

    // Check river pot
    if (hand.actions.turn && hand.actions.river) {
      const turnPotAfter =
        hand.actions.turn.pot_size_before +
        hand.actions.turn.actions.reduce((sum: number, a: Action) => sum + (a.amount || 0), 0)
      const potDiff = Math.abs(
        hand.actions.river.pot_size_before - turnPotAfter
      )
      if (potDiff > 0.1) {
        errors.push({
          type: 'pot_inconsistency' as ErrorType,
          handId: hand.hand_id,
          message: `River pot (${hand.actions.river.pot_size_before} BB) != Turn total (${turnPotAfter.toFixed(2)} BB)`,
          severity: 'high' as ErrorSeverity,
          suggestedFix: 'Re-check OCR for pot size at River',
          affectedFields: ['actions.river.pot_size_before', 'actions.turn'],
        })
      }
    }

    return errors
  }

  /**
   * Check stack consistency (stack should decrease after bets)
   */
  private checkStackConsistency(hand: Hand): HandError[] {
    const errors: HandError[] = []

    // Build a map of each player's total bets
    const playerBets = new Map<string, number>()

    // Add antes for all players
    for (const player of hand.players) {
      playerBets.set(player.name, hand.blinds.ante)
    }

    // Add blinds for SB and BB
    for (const player of hand.players) {
      if (player.position === 'SB') {
        const current = playerBets.get(player.name) || 0
        playerBets.set(player.name, current + hand.blinds.sb_amount)
      } else if (player.position === 'BB') {
        const current = playerBets.get(player.name) || 0
        playerBets.set(player.name, current + hand.blinds.bb_amount)
      }
    }

    // Count bets from all streets
    for (const action of hand.actions.preflop) {
      if (action.amount) {
        const current = playerBets.get(action.player) || 0
        playerBets.set(action.player, current + action.amount)
      }
    }

    for (const street of ['flop', 'turn', 'river'] as const) {
      const streetActions = hand.actions[street]
      if (streetActions) {
        for (const action of streetActions.actions) {
          if (action.amount) {
            const current = playerBets.get(action.player) || 0
            playerBets.set(action.player, current + action.amount)
          }
        }
      }
    }

    // Check each player's stack
    for (const player of hand.players) {
      const totalBet = playerBets.get(player.name) || 0
      const expectedStackEnd = player.stack_start - totalBet

      // If this player is the winner, add winnings
      let expectedWithWinnings = expectedStackEnd
      if (hand.result.winner === player.name) {
        expectedWithWinnings += hand.result.pot_final
      }

      const stackDiff = Math.abs(player.stack_end - expectedWithWinnings)
      if (stackDiff > 0.1) {
        // Allow 0.1 BB tolerance
        errors.push({
          type: 'stack_mismatch' as ErrorType,
          handId: hand.hand_id,
          message: `${player.name}: Expected stack ${expectedWithWinnings.toFixed(2)} BB, got ${player.stack_end} BB (diff: ${stackDiff.toFixed(2)})`,
          severity: 'medium' as ErrorSeverity,
          suggestedFix: 'Verify bet amounts and pot calculation',
          affectedFields: [
            `players[${player.name}].stack_start`,
            `players[${player.name}].stack_end`,
          ],
        })
      }
    }

    return errors
  }

  /**
   * Check action order validity
   */
  private checkActionOrder(hand: Hand): HandError[] {
    const errors: HandError[] = []

    // Check each player's action sequence across all streets
    for (const player of hand.players) {
      const playerActions: Action[] = []

      // Collect all actions for this player
      for (const action of hand.actions.preflop) {
        if (action.player === player.name) {
          playerActions.push(action)
        }
      }

      for (const street of ['flop', 'turn', 'river'] as const) {
        const streetActions = hand.actions[street]
        if (streetActions) {
          for (const action of streetActions.actions) {
            if (action.player === player.name) {
              playerActions.push(action)
            }
          }
        }
      }

      // Check for invalid sequences
      for (let i = 0; i < playerActions.length - 1; i++) {
        const action1 = playerActions[i]
        const action2 = playerActions[i + 1]

        // Check if this sequence is invalid
        if (this.errorPatterns?.action_sequences) {
          for (const invalidSeq of this.errorPatterns.action_sequences) {
            if (
              invalidSeq.invalid[0] === action1.action &&
              invalidSeq.invalid[1] === action2.action
            ) {
              errors.push({
                type: 'invalid_action_order' as ErrorType,
                handId: hand.hand_id,
                message: `${player.name}: Invalid sequence ${action1.action} → ${action2.action}. ${invalidSeq.reason}`,
                severity: 'high' as ErrorSeverity,
                suggestedFix: invalidSeq.suggestedFix,
                affectedFields: ['actions'],
              })
            }
          }
        }
      }
    }

    return errors
  }

  /**
   * Check card validity (valid rank and suit)
   */
  private checkCardValidity(hand: Hand): HandError[] {
    const errors: HandError[] = []
    const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
    const validSuits = ['s', 'h', 'd', 'c']

    const checkCard = (card: Card, fieldPath: string) => {
      if (card.length !== 2) {
        errors.push({
          type: 'invalid_card' as ErrorType,
          handId: hand.hand_id,
          message: `Invalid card format: ${card} (expected format: As, Kh, etc.)`,
          severity: 'critical' as ErrorSeverity,
          suggestedFix: 'Re-check OCR for card values',
          affectedFields: [fieldPath],
        })
        return
      }

      const rank = card[0]
      const suit = card[1]

      if (!validRanks.includes(rank)) {
        errors.push({
          type: 'invalid_card' as ErrorType,
          handId: hand.hand_id,
          message: `Invalid card rank: ${rank} in ${card}`,
          severity: 'critical' as ErrorSeverity,
          suggestedFix: `Valid ranks: ${validRanks.join(', ')}`,
          affectedFields: [fieldPath],
        })
      }

      if (!validSuits.includes(suit)) {
        errors.push({
          type: 'invalid_card' as ErrorType,
          handId: hand.hand_id,
          message: `Invalid card suit: ${suit} in ${card}`,
          severity: 'critical' as ErrorSeverity,
          suggestedFix: `Valid suits: s (spades), h (hearts), d (diamonds), c (clubs)`,
          affectedFields: [fieldPath],
        })
      }
    }

    // Check hole cards
    for (let i = 0; i < hand.players.length; i++) {
      const player = hand.players[i]
      if (player.hole_cards) {
        for (let j = 0; j < player.hole_cards.length; j++) {
          checkCard(player.hole_cards[j], `players[${i}].hole_cards[${j}]`)
        }
      }
    }

    // Check board cards
    if (hand.actions.flop?.cards) {
      for (let i = 0; i < hand.actions.flop.cards.length; i++) {
        checkCard(hand.actions.flop.cards[i], `actions.flop.cards[${i}]`)
      }
    }
    if (hand.actions.turn?.cards) {
      checkCard(hand.actions.turn.cards[3], 'actions.turn.cards[3]')
    }
    if (hand.actions.river?.cards) {
      checkCard(hand.actions.river.cards[4], 'actions.river.cards[4]')
    }

    return errors
  }

  /**
   * Load error patterns from JSON file
   */
  private async loadErrorPatterns(): Promise<void> {
    try {
      const patternsPath = path.join(__dirname, 'error-patterns.json')
      const data = await fs.readFile(patternsPath, 'utf-8')
      this.errorPatterns = JSON.parse(data)
    } catch (error: any) {
      console.warn('Failed to load error patterns:', error.message)
      this.errorPatterns = { action_sequences: [] }
    }
  }

  /**
   * Group errors by type
   */
  private groupErrorsByType(errors: HandError[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    for (const error of errors) {
      grouped[error.type] = (grouped[error.type] || 0) + 1
    }
    return grouped
  }

  /**
   * Group errors by hand
   */
  private groupErrorsByHand(errors: HandError[]): Record<string, HandError[]> {
    const grouped: Record<string, HandError[]> = {}
    for (const error of errors) {
      if (!grouped[error.handId]) {
        grouped[error.handId] = []
      }
      grouped[error.handId].push(error)
    }
    return grouped
  }

  /**
   * Group errors by severity
   */
  private groupErrorsBySeverity(
    errors: HandError[]
  ): Record<ErrorSeverity, number> {
    const grouped: Record<ErrorSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
    for (const error of errors) {
      grouped[error.severity] = (grouped[error.severity] || 0) + 1
    }
    return grouped
  }

  /**
   * Calculate average confidence across all hands
   */
  private calculateAverageConfidence(hands: Hand[]): number {
    if (hands.length === 0) return 0
    const sum = hands.reduce((acc, hand) => acc + hand.confidence, 0)
    return sum / hands.length
  }

  /**
   * Generate recommendations based on errors
   */
  private generateRecommendations(
    errors: HandError[],
    hands: Hand[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    // No recommendations if no hands
    if (hands.length === 0) {
      return recommendations
    }

    // Group errors by type
    const errorsByType = this.groupErrorsByType(errors)

    // Recommendation 1: If many duplicate card errors, re-run with stricter card validation
    if (errorsByType.duplicate_card && errorsByType.duplicate_card > 2) {
      recommendations.push({
        priority: 'high',
        action: 'Re-analyze with enhanced card recognition',
        reason: `Found ${errorsByType.duplicate_card} duplicate card errors across multiple hands`,
        affectedHands: errors
          .filter((e) => e.type === 'duplicate_card')
          .map((e) => e.handId),
      })
    }

    // Recommendation 2: If pot inconsistencies, add pot calculation instructions
    if (
      errorsByType.pot_inconsistency &&
      errorsByType.pot_inconsistency > 3
    ) {
      recommendations.push({
        priority: 'high',
        action: 'Add explicit pot calculation instructions to prompt',
        reason: `Found ${errorsByType.pot_inconsistency} pot inconsistencies`,
        affectedHands: errors
          .filter((e) => e.type === 'pot_inconsistency')
          .map((e) => e.handId),
      })
    }

    // Recommendation 3: Low average confidence, suggest re-analysis
    const avgConfidence = this.calculateAverageConfidence(hands)
    if (avgConfidence < 0.8) {
      recommendations.push({
        priority: 'medium',
        action: 'Re-analyze all hands with iteration system',
        reason: `Average confidence is low: ${(avgConfidence * 100).toFixed(1)}%`,
        affectedHands: hands.filter((h) => h.confidence < 0.8).map((h) => h.hand_id),
      })
    }

    // Recommendation 4: Many critical errors, manual review needed
    const criticalErrors = errors.filter((e) => e.severity === 'critical').length
    if (criticalErrors > 5) {
      recommendations.push({
        priority: 'high',
        action: 'Manual review required for critical errors',
        reason: `Found ${criticalErrors} critical errors`,
        affectedHands: errors
          .filter((e) => e.severity === 'critical')
          .map((e) => e.handId),
      })
    }

    return recommendations
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default ErrorAnalyzer
