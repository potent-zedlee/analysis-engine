export declare enum ErrorType {
    OCR_MISREAD = "ocr_misread",
    OCR_MISSING = "ocr_missing",
    DUPLICATE_CARD = "duplicate_card",
    INVALID_CARD = "invalid_card",
    POT_INCONSISTENCY = "pot_inconsistency",
    STACK_MISMATCH = "stack_mismatch",
    INVALID_ACTION_ORDER = "invalid_action_order",
    HAND_OVERLAP = "hand_overlap",
    HAND_SPLIT = "hand_split",
    VIDEO_OCR_CONFLICT = "video_ocr_conflict",
    AUDIO_OCR_CONFLICT = "audio_ocr_conflict"
}
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
export interface HandError {
    type: ErrorType;
    handId: string;
    message: string;
    severity: ErrorSeverity;
    suggestedFix?: string;
    affectedFields?: string[];
}
export interface ErrorReport {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsByHand: Record<string, HandError[]>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    averageConfidence: number;
    recommendedActions: Recommendation[];
}
export interface Recommendation {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
    affectedHands: string[];
}
export interface OCRConfusable {
    pattern: string;
    correction: string;
    confidence_boost?: number;
    note?: string;
}
export interface InvalidActionSequence {
    invalid: string[];
    reason: string;
    suggestedFix: string;
}
export interface PotCalculationError {
    symptom: string;
    likely_cause: string;
    fix: string;
}
export interface ErrorPatterns {
    ocr_confusables: OCRConfusable[];
    action_sequences: InvalidActionSequence[];
    pot_calculation_errors: PotCalculationError[];
}
export default HandError;
//# sourceMappingURL=error.d.ts.map