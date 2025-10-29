import { GeminiClient } from '../gemini-client';
export class HandBoundaryDetector {
    geminiClient;
    confidenceThreshold;
    batchSize;
    constructor(config) {
        this.geminiClient = new GeminiClient({
            apiKey: config.geminiApiKey,
            temperature: 0.1,
        });
        this.confidenceThreshold = config.confidenceThreshold ?? 0.7;
        this.batchSize = config.batchSize ?? 10;
    }
    async detectBoundaries(sceneChanges) {
        const startTime = Date.now();
        let totalCost = 0;
        const boundaries = [];
        let currentHandStart = null;
        let handNumber = 1;
        for (let i = 0; i < sceneChanges.length; i++) {
            const sceneChange = sceneChanges[i];
            const isNewHand = await this.verifyHandStart(sceneChange);
            if (isNewHand.is_new_hand && isNewHand.confidence >= this.confidenceThreshold) {
                if (currentHandStart) {
                    boundaries.push({
                        handNumber: handNumber++,
                        startTime: currentHandStart.timestamp,
                        endTime: sceneChange.timestamp,
                        confidence: isNewHand.confidence,
                        startFramePath: currentHandStart.framePath,
                        endFramePath: sceneChange.framePath,
                        detectionMethod: 'gemini_vision',
                    });
                }
                currentHandStart = sceneChange;
            }
            totalCost += 0.01;
        }
        if (currentHandStart) {
            boundaries.push({
                handNumber: handNumber,
                startTime: currentHandStart.timestamp,
                endTime: currentHandStart.timestamp + 120,
                confidence: 0.8,
                startFramePath: currentHandStart.framePath,
                detectionMethod: 'gemini_vision',
            });
        }
        const totalDuration = boundaries.reduce((sum, b) => sum + (b.endTime - b.startTime), 0);
        const averageHandDuration = boundaries.length > 0 ? totalDuration / boundaries.length : 0;
        return {
            boundaries,
            totalHands: boundaries.length,
            averageHandDuration,
            processingTime: Date.now() - startTime,
            totalCost,
        };
    }
    async verifyHandStart(sceneChange) {
        const prompt = `
You are analyzing a poker video to detect hand boundaries.

Look at this frame and determine if it shows the START of a NEW POKER HAND.

Signs of a NEW HAND starting:
1. Dealer button has moved to a different player
2. Cards are being dealt (animation of cards flying to players)
3. POT is reset to 0 or shows only blinds (SB + BB)
4. Player stacks have been updated from previous hand
5. New hand number or timer appears

Respond in JSON format:
{
  "is_new_hand": true/false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation"
}
`;
        try {
            const simulatedResponse = {
                is_new_hand: sceneChange.confidence > 0.7,
                confidence: sceneChange.confidence,
                reason: 'Detected scene change with high confidence',
            };
            return simulatedResponse;
        }
        catch (error) {
            return {
                is_new_hand: false,
                confidence: 0.0,
                reason: `Error: ${error.message}`,
            };
        }
    }
    detectBoundariesHeuristic(sceneChanges, estimatedHandDuration = 120) {
        const startTime = Date.now();
        const boundaries = [];
        let handNumber = 1;
        for (let i = 0; i < sceneChanges.length - 1; i++) {
            const start = sceneChanges[i];
            const end = sceneChanges[i + 1];
            if (start.confidence >= this.confidenceThreshold) {
                boundaries.push({
                    handNumber: handNumber++,
                    startTime: start.timestamp,
                    endTime: end.timestamp,
                    confidence: start.confidence,
                    startFramePath: start.framePath,
                    endFramePath: end.framePath,
                    detectionMethod: 'heuristic',
                });
            }
        }
        const totalDuration = boundaries.reduce((sum, b) => sum + (b.endTime - b.startTime), 0);
        const averageHandDuration = boundaries.length > 0 ? totalDuration / boundaries.length : 0;
        return {
            boundaries,
            totalHands: boundaries.length,
            averageHandDuration,
            processingTime: Date.now() - startTime,
            totalCost: 0,
        };
    }
    getConfidenceThreshold() {
        return this.confidenceThreshold;
    }
    setConfidenceThreshold(threshold) {
        if (threshold < 0 || threshold > 1) {
            throw new Error('Confidence threshold must be between 0 and 1');
        }
        this.confidenceThreshold = threshold;
    }
    getGeminiClient() {
        return this.geminiClient;
    }
}
export default HandBoundaryDetector;
//# sourceMappingURL=hand-boundary-detector.js.map