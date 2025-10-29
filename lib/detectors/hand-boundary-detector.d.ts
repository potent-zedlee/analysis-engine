import { GeminiClient } from '../gemini-client.js';
import type { SceneChange } from './scene-change-detector.js';
export interface HandBoundaryDetectorConfig {
    geminiApiKey: string;
    confidenceThreshold?: number;
    batchSize?: number;
}
export interface HandBoundary {
    handNumber: number;
    startTime: number;
    endTime: number;
    confidence: number;
    startFramePath: string;
    endFramePath?: string;
    detectionMethod: 'gemini_vision' | 'heuristic';
}
export interface HandBoundaryResult {
    boundaries: HandBoundary[];
    totalHands: number;
    averageHandDuration: number;
    processingTime: number;
    totalCost: number;
}
export declare class HandBoundaryDetector {
    private geminiClient;
    private confidenceThreshold;
    private batchSize;
    constructor(config: HandBoundaryDetectorConfig);
    detectBoundaries(sceneChanges: SceneChange[]): Promise<HandBoundaryResult>;
    private verifyHandStart;
    detectBoundariesHeuristic(sceneChanges: SceneChange[], estimatedHandDuration?: number): HandBoundaryResult;
    getConfidenceThreshold(): number;
    setConfidenceThreshold(threshold: number): void;
    getGeminiClient(): GeminiClient;
}
export default HandBoundaryDetector;
//# sourceMappingURL=hand-boundary-detector.d.ts.map