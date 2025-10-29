import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
export class GeminiClient {
    genAI;
    model;
    config;
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.config = {
            apiKey: config.apiKey,
            model: config.model || 'gemini-1.5-pro-latest',
            maxOutputTokens: config.maxOutputTokens || 8192,
            temperature: config.temperature ?? 0.1,
            topK: config.topK || 40,
            topP: config.topP || 0.95,
        };
        this.genAI = new GoogleGenerativeAI(this.config.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: this.config.model,
            generationConfig: {
                maxOutputTokens: this.config.maxOutputTokens,
                temperature: this.config.temperature,
                topK: this.config.topK,
                topP: this.config.topP,
            },
        });
    }
    async analyzeVideo(options) {
        const startTime = Date.now();
        await this.validateVideoFile(options.videoPath);
        const videoData = await fs.readFile(options.videoPath);
        const mimeType = options.mimeType || this.detectMimeType(options.videoPath);
        const videoPart = {
            inlineData: {
                data: videoData.toString('base64'),
                mimeType,
            },
        };
        const result = await this.model.generateContent([options.prompt, videoPart]);
        const response = result.response;
        const rawText = response.text();
        const data = this.parseJSONResponse(rawText);
        const tokensUsed = {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0,
        };
        return {
            data,
            rawText,
            tokensUsed,
            metadata: {
                modelUsed: this.config.model,
                finishReason: response.candidates?.[0]?.finishReason || 'unknown',
                safetyRatings: response.candidates?.[0]?.safetyRatings || [],
                processingTime: Date.now() - startTime,
            },
        };
    }
    async analyzeText(prompt) {
        const startTime = Date.now();
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const rawText = response.text();
        const data = this.parseJSONResponse(rawText);
        const tokensUsed = {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0,
        };
        return {
            data,
            rawText,
            tokensUsed,
            metadata: {
                modelUsed: this.config.model,
                finishReason: response.candidates?.[0]?.finishReason || 'unknown',
                safetyRatings: response.candidates?.[0]?.safetyRatings || [],
                processingTime: Date.now() - startTime,
            },
        };
    }
    parseJSONResponse(text) {
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
        const objectMatch = jsonText.match(/\{[\s\S]*\}/);
        if (arrayMatch) {
            jsonText = arrayMatch[0];
        }
        else if (objectMatch) {
            jsonText = objectMatch[0];
        }
        try {
            return JSON.parse(jsonText);
        }
        catch (error) {
            throw new GeminiParseError(`Failed to parse JSON from Gemini response: ${error.message}\n\nResponse text:\n${text}`);
        }
    }
    async validateVideoFile(videoPath) {
        try {
            await fs.access(videoPath);
        }
        catch (error) {
            throw new Error(`Video file not found or not accessible: ${videoPath}`);
        }
    }
    detectMimeType(videoPath) {
        const ext = path.extname(videoPath).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska',
            '.flv': 'video/x-flv',
        };
        return mimeTypes[ext] || 'video/mp4';
    }
    getConfig() {
        return { ...this.config };
    }
    getModelName() {
        return this.config.model;
    }
    estimateCost(videoFileSizeMB, estimatedOutputTokens) {
        const videoTokens = videoFileSizeMB * 260;
        const inputCost = (videoTokens / 1_000_000) * 7.0;
        const outputCost = (estimatedOutputTokens / 1_000_000) * 21.0;
        return inputCost + outputCost;
    }
}
export class GeminiParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GeminiParseError';
    }
}
export class GeminiAPIError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GeminiAPIError';
    }
}
export default GeminiClient;
//# sourceMappingURL=gemini-client.js.map