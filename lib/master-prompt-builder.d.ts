import type { LayoutType } from './layouts.js';
export interface MasterPromptBuilderConfig {
    layoutsDataPath?: string;
    promptsDir?: string;
}
export interface BuildPromptOptions {
    layout: LayoutType;
    errorCorrections?: string;
    customPlaceholders?: Record<string, string>;
}
export interface MasterPrompt {
    layout: LayoutType;
    prompt: string;
    placeholders: string[];
    confidence: number;
    metadata: {
        templatePath: string;
        layoutDataPath: string;
        buildTime: number;
    };
}
export declare class MasterPromptBuilder {
    private layoutsDataPath;
    private promptsDir;
    private templateCache;
    constructor(config?: MasterPromptBuilderConfig);
    buildPrompt(options: BuildPromptOptions): Promise<MasterPrompt>;
    private loadTemplate;
    private getTemplatePath;
    clearCache(): void;
    preloadTemplates(): Promise<void>;
    validateTemplates(): Promise<LayoutType[]>;
    getTemplatePlaceholders(layout: LayoutType): Promise<string[]>;
}
export default MasterPromptBuilder;
//# sourceMappingURL=master-prompt-builder.d.ts.map