import type { Hand } from './types/hand.js';
import type { ErrorReport } from './types/error.js';
export declare class ErrorAnalyzer {
    private errorPatterns;
    analyzeHands(hands: Hand[]): Promise<ErrorReport>;
    private checkDuplicateCards;
    private checkPotConsistency;
    private checkStackConsistency;
    private checkActionOrder;
    private checkCardValidity;
    private loadErrorPatterns;
    private groupErrorsByType;
    private groupErrorsByHand;
    private groupErrorsBySeverity;
    private calculateAverageConfidence;
    private generateRecommendations;
}
export default ErrorAnalyzer;
//# sourceMappingURL=error-analyzer.d.ts.map