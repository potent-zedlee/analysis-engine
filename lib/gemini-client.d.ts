export interface GeminiClientConfig {
    apiKey: string;
    model?: string;
    maxOutputTokens?: number;
    temperature?: number;
    topK?: number;
    topP?: number;
}
export interface VideoAnalysisOptions {
    videoPath: string;
    prompt: string;
    mimeType?: string;
}
export interface GeminiResponse<T = any> {
    data: T;
    rawText: string;
    tokensUsed: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    metadata: {
        modelUsed: string;
        finishReason: string;
        safetyRatings: any[];
        processingTime: number;
    };
}
export declare class GeminiClient {
    private genAI;
    private model;
    private config;
    constructor(config: GeminiClientConfig);
    analyzeVideo<T = any>(options: VideoAnalysisOptions): Promise<GeminiResponse<T>>;
    analyzeText<T = any>(prompt: string): Promise<GeminiResponse<T>>;
    private parseJSONResponse;
    private validateVideoFile;
    private detectMimeType;
    getConfig(): Required<GeminiClientConfig>;
    getModelName(): string;
    estimateCost(videoFileSizeMB: number, estimatedOutputTokens: number): number;
}
export declare class GeminiParseError extends Error {
    constructor(message: string);
}
export declare class GeminiAPIError extends Error {
    constructor(message: string);
}
export default GeminiClient;
//# sourceMappingURL=gemini-client.d.ts.map