interface ImageInput {
    mimeType: string;
    data: string;
}
export interface ChatMessage {
    role: "user" | "model";
    parts: {
        text?: string;
        inlineData?: ImageInput;
    }[];
}
declare class GeminiModel {
    private modelName;
    SendMessage({ prompt, image, history, apiKey, }: {
        prompt: string;
        history?: ChatMessage[];
        image?: ImageInput;
        apiKey: string;
    }): Promise<string>;
}
export declare const geminiModel: GeminiModel;
export {};
//# sourceMappingURL=gemini.d.ts.map