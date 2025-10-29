import type { Hand } from './types/hand.js';
import type { HandError } from './types/error.js';
export interface IterationContext {
    iterationNumber: number;
    previousErrors: HandError[];
    previousConfidence: number;
    handId: string;
}
export interface OptimizationResult {
    optimizedPrompt: string;
    confidenceThreshold: number;
    focusAreas: string[];
}
export declare class PromptOptimizer {
    optimizePrompt(basePrompt: string, context: IterationContext): OptimizationResult;
    private identifyFocusAreas;
    private generateErrorCorrections;
    private getIterationInstructions;
    getConfidenceThreshold(iterationNumber: number): number;
    shouldRetry(hand: Hand, errors: HandError[], iterationNumber: number): boolean;
}
export default PromptOptimizer;
//# sourceMappingURL=prompt-optimizer.d.ts.map