import { promises as fs } from 'fs';
import path from 'path';
export class SceneChangeDetector {
    config;
    constructor(config = {}) {
        this.config = {
            threshold: config.threshold ?? 0.3,
            minSceneDuration: config.minSceneDuration ?? 5,
            checkInterval: config.checkInterval ?? 2,
        };
    }
    async detectFromFrames(framesDir, fps) {
        const startTime = Date.now();
        const frameFiles = await this.getFrameFiles(framesDir);
        if (frameFiles.length === 0) {
            throw new Error(`No frame files found in ${framesDir}`);
        }
        const sceneChanges = [];
        const framesPerCheck = Math.floor(fps * this.config.checkInterval);
        for (let i = 0; i < frameFiles.length; i += framesPerCheck) {
            if (i === 0)
                continue;
            const timestamp = i / fps;
            sceneChanges.push({
                frameIndex: i,
                timestamp,
                confidence: 0.8,
                framePath: frameFiles[i],
            });
        }
        const filteredChanges = this.filterByMinDuration(sceneChanges);
        return {
            sceneChanges: filteredChanges,
            totalFrames: frameFiles.length,
            totalScenes: filteredChanges.length + 1,
            processingTime: Date.now() - startTime,
        };
    }
    simulateSceneChanges(videoDurationSeconds) {
        const startTime = Date.now();
        const sceneChanges = [];
        const totalFrames = Math.floor(videoDurationSeconds * 30);
        for (let timestamp = this.config.checkInterval; timestamp < videoDurationSeconds; timestamp += this.config.checkInterval) {
            sceneChanges.push({
                frameIndex: Math.floor(timestamp * 30),
                timestamp,
                confidence: 0.7 + Math.random() * 0.3,
                framePath: `frame_${timestamp}.jpg`,
            });
        }
        const filteredChanges = this.filterByMinDuration(sceneChanges);
        return {
            sceneChanges: filteredChanges,
            totalFrames,
            totalScenes: filteredChanges.length + 1,
            processingTime: Date.now() - startTime,
        };
    }
    async getFrameFiles(framesDir) {
        const files = await fs.readdir(framesDir);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp'];
        const frameFiles = files
            .filter((file) => {
            const ext = path.extname(file).toLowerCase();
            return imageExtensions.includes(ext);
        })
            .sort()
            .map((file) => path.join(framesDir, file));
        return frameFiles;
    }
    filterByMinDuration(sceneChanges) {
        if (sceneChanges.length === 0)
            return [];
        const filtered = [sceneChanges[0]];
        for (let i = 1; i < sceneChanges.length; i++) {
            const prev = filtered[filtered.length - 1];
            const current = sceneChanges[i];
            const duration = current.timestamp - prev.timestamp;
            if (duration >= this.config.minSceneDuration) {
                filtered.push(current);
            }
        }
        return filtered;
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(config) {
        if (config.threshold !== undefined) {
            if (config.threshold < 0 || config.threshold > 1) {
                throw new Error('Threshold must be between 0 and 1');
            }
            this.config.threshold = config.threshold;
        }
        if (config.minSceneDuration !== undefined) {
            if (config.minSceneDuration < 0) {
                throw new Error('minSceneDuration must be >= 0');
            }
            this.config.minSceneDuration = config.minSceneDuration;
        }
        if (config.checkInterval !== undefined) {
            if (config.checkInterval <= 0) {
                throw new Error('checkInterval must be > 0');
            }
            this.config.checkInterval = config.checkInterval;
        }
    }
}
export default SceneChangeDetector;
//# sourceMappingURL=scene-change-detector.js.map