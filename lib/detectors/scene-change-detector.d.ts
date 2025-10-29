export interface SceneChangeDetectorConfig {
    threshold?: number;
    minSceneDuration?: number;
    checkInterval?: number;
}
export interface SceneChange {
    frameIndex: number;
    timestamp: number;
    confidence: number;
    framePath: string;
}
export interface SceneChangeResult {
    sceneChanges: SceneChange[];
    totalFrames: number;
    totalScenes: number;
    processingTime: number;
}
export declare class SceneChangeDetector {
    private config;
    constructor(config?: SceneChangeDetectorConfig);
    detectFromFrames(framesDir: string, fps: number): Promise<SceneChangeResult>;
    simulateSceneChanges(videoDurationSeconds: number): SceneChangeResult;
    private getFrameFiles;
    private filterByMinDuration;
    getConfig(): Required<SceneChangeDetectorConfig>;
    updateConfig(config: Partial<SceneChangeDetectorConfig>): void;
}
export default SceneChangeDetector;
//# sourceMappingURL=scene-change-detector.d.ts.map