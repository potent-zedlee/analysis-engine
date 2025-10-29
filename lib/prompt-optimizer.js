export class PromptOptimizer {
    optimizePrompt(basePrompt, context) {
        const focusAreas = this.identifyFocusAreas(context.previousErrors);
        const errorCorrections = this.generateErrorCorrections(context.previousErrors);
        const iterationInstructions = this.getIterationInstructions(context.iterationNumber);
        let optimizedPrompt = basePrompt;
        optimizedPrompt += `\n\n# ITERATION ${context.iterationNumber}\n`;
        optimizedPrompt += `This is iteration ${context.iterationNumber} of 3. `;
        optimizedPrompt += `Previous analysis had ${context.previousErrors.length} error(s). `;
        optimizedPrompt += `Please pay extra attention to the following areas:\n`;
        if (focusAreas.length > 0) {
            optimizedPrompt += `\n## FOCUS AREAS:\n`;
            for (const area of focusAreas) {
                optimizedPrompt += `- ${area}\n`;
            }
        }
        if (errorCorrections.length > 0) {
            optimizedPrompt += `\n## ERROR CORRECTIONS:\n`;
            for (const correction of errorCorrections) {
                optimizedPrompt += `${correction}\n`;
            }
        }
        if (iterationInstructions) {
            optimizedPrompt += `\n## ITERATION INSTRUCTIONS:\n`;
            optimizedPrompt += `${iterationInstructions}\n`;
        }
        return {
            optimizedPrompt,
            confidenceThreshold: this.getConfidenceThreshold(context.iterationNumber),
            focusAreas,
        };
    }
    identifyFocusAreas(errors) {
        const focusAreas = [];
        const errorTypes = new Set(errors.map((e) => e.type));
        if (errorTypes.has('duplicate_card')) {
            focusAreas.push('Card Recognition: Ensure all cards are unique (no duplicates)');
        }
        if (errorTypes.has('invalid_card')) {
            focusAreas.push('Card Validity: Only use valid ranks (A,K,Q,J,T,9,8,7,6,5,4,3,2) and suits (s,h,d,c)');
        }
        if (errorTypes.has('pot_inconsistency')) {
            focusAreas.push('Pot Calculation: Carefully verify pot size = SB + BB + (Ante × Players) + All Bets');
        }
        if (errorTypes.has('stack_mismatch')) {
            focusAreas.push('Stack Tracking: Verify stack_end = stack_start - Ante - Blind - Bets + Winnings');
        }
        if (errorTypes.has('invalid_action_order')) {
            focusAreas.push('Action Order: Check that players cannot act after folding or going all-in');
        }
        return focusAreas;
    }
    generateErrorCorrections(errors) {
        const corrections = [];
        for (const error of errors) {
            if (error.suggestedFix) {
                corrections.push(`- ${error.message} → ${error.suggestedFix}`);
            }
        }
        return corrections;
    }
    getIterationInstructions(iterationNumber) {
        switch (iterationNumber) {
            case 1:
                return '';
            case 2:
                return `This is the second attempt. Please be extra careful with:
- OCR accuracy (double-check all text)
- Card recognition (verify no duplicates)
- Mathematical calculations (pot sizes, stack changes)`;
            case 3:
                return `This is the FINAL attempt. Apply maximum scrutiny:
- Triple-check all OCR results
- Verify every card is valid and unique
- Manually calculate pot sizes and stack changes step-by-step
- If uncertain about any value, prefer to leave it blank rather than guess`;
            default:
                return '';
        }
    }
    getConfidenceThreshold(iterationNumber) {
        switch (iterationNumber) {
            case 1:
                return 0.85;
            case 2:
                return 0.90;
            case 3:
                return 0.95;
            default:
                return 0.85;
        }
    }
    shouldRetry(hand, errors, iterationNumber) {
        if (iterationNumber >= 3) {
            return false;
        }
        const threshold = this.getConfidenceThreshold(iterationNumber);
        if (hand.confidence < threshold) {
            return true;
        }
        const hasCriticalErrors = errors.some((e) => e.severity === 'critical' || e.severity === 'high');
        if (hasCriticalErrors) {
            return true;
        }
        return false;
    }
}
export default PromptOptimizer;
//# sourceMappingURL=prompt-optimizer.js.map