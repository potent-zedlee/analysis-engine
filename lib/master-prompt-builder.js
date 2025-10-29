import { promises as fs } from 'fs';
import path from 'path';
import { loadLayoutMetadata, formatOSDPositionsForPrompt, getRecommendedConfidenceThreshold, } from './layouts';
export class MasterPromptBuilder {
    layoutsDataPath;
    promptsDir;
    templateCache = new Map();
    constructor(config = {}) {
        this.layoutsDataPath =
            config.layoutsDataPath || path.join(process.cwd(), 'data', 'layouts.json');
        this.promptsDir = config.promptsDir || path.join(process.cwd(), 'prompts');
    }
    async buildPrompt(options) {
        const startTime = Date.now();
        const template = await this.loadTemplate(options.layout);
        const metadata = await loadLayoutMetadata(options.layout);
        const layoutInfo = formatOSDPositionsForPrompt(metadata);
        const confidence = getRecommendedConfidenceThreshold(metadata);
        const placeholderValues = {
            LAYOUT_INFO: layoutInfo,
            ERROR_CORRECTIONS: options.errorCorrections || '',
            ...options.customPlaceholders,
        };
        let prompt = template;
        const replacedPlaceholders = [];
        for (const [key, value] of Object.entries(placeholderValues)) {
            const placeholder = `{{${key}}}`;
            if (template.includes(placeholder)) {
                prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
                replacedPlaceholders.push(key);
            }
        }
        return {
            layout: options.layout,
            prompt,
            placeholders: replacedPlaceholders,
            confidence,
            metadata: {
                templatePath: this.getTemplatePath(options.layout),
                layoutDataPath: this.layoutsDataPath,
                buildTime: Date.now() - startTime,
            },
        };
    }
    async loadTemplate(layout) {
        if (this.templateCache.has(layout)) {
            return this.templateCache.get(layout);
        }
        const templatePath = this.getTemplatePath(layout);
        try {
            const template = await fs.readFile(templatePath, 'utf-8');
            this.templateCache.set(layout, template);
            return template;
        }
        catch (error) {
            throw new Error(`Failed to load template for layout "${layout}" from ${templatePath}: ${error.message}`);
        }
    }
    getTemplatePath(layout) {
        return path.join(this.promptsDir, `${layout}-master-prompt.txt`);
    }
    clearCache() {
        this.templateCache.clear();
    }
    async preloadTemplates() {
        const layouts = ['triton', 'hustler', 'wsop', 'apt', 'base'];
        await Promise.all(layouts.map(async (layout) => {
            try {
                await this.loadTemplate(layout);
            }
            catch (error) {
            }
        }));
    }
    async validateTemplates() {
        const layouts = ['triton', 'hustler', 'wsop', 'apt', 'base'];
        const missing = [];
        await Promise.all(layouts.map(async (layout) => {
            try {
                await this.loadTemplate(layout);
            }
            catch (error) {
                missing.push(layout);
            }
        }));
        return missing;
    }
    async getTemplatePlaceholders(layout) {
        const template = await this.loadTemplate(layout);
        const regex = /\{\{([A-Z_]+)\}\}/g;
        const placeholders = [];
        let match;
        while ((match = regex.exec(template)) !== null) {
            if (!placeholders.includes(match[1])) {
                placeholders.push(match[1]);
            }
        }
        return placeholders;
    }
}
export default MasterPromptBuilder;
//# sourceMappingURL=master-prompt-builder.js.map