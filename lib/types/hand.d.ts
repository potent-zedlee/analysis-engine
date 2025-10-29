export type Card = string;
export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'MP+1' | 'CO';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
export interface Player {
    name: string;
    position: Position;
    stack_start: number;
    stack_end: number;
    hole_cards?: [Card, Card];
    is_hero?: boolean;
}
export interface Action {
    player: string;
    action: ActionType;
    amount?: number;
    all_in?: boolean;
}
export interface StreetActions {
    pot_size_before: number;
    cards?: Card[];
    actions: Action[];
}
export interface PreflopActions {
    pot_size_before: number;
    actions: Action[];
}
export interface FlopActions extends StreetActions {
    cards: [Card, Card, Card];
}
export interface TurnActions extends StreetActions {
    cards: [Card, Card, Card, Card];
}
export interface RiverActions extends StreetActions {
    cards: [Card, Card, Card, Card, Card];
}
export interface HandResult {
    winner: string;
    pot_final: number;
    winning_hand?: string;
    cards_shown?: Record<string, [Card, Card]>;
}
export interface Blinds {
    sb_amount: number;
    bb_amount: number;
    ante: number;
}
export interface Hand {
    hand_id: string;
    timestamp: number;
    video_url?: string;
    layout: string;
    blinds: Blinds;
    players: Player[];
    actions: {
        preflop: Action[];
        flop?: FlopActions;
        turn?: TurnActions;
        river?: RiverActions;
    };
    result: HandResult;
    confidence: number;
    extraction_method: 'gemini_vision' | 'manual';
}
export default Hand;
//# sourceMappingURL=hand.d.ts.map