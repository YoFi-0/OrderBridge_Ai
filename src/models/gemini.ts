import { OpenRouter } from "@openrouter/sdk";
import dotenv from "dotenv";
dotenv.config();

interface ImageInput {
    mimeType: string;
    data: string; // base64-encoded image data
}

export interface ChatMessage {
    role: "user" | "model";
    parts: {
        text?: string;
        inlineData?: ImageInput;
    }[];
}

class GeminiModel {
    private modelName = "google/gemini-3-pro-preview";

    public async SendMessage({
        prompt,
        image,
        history,
        apiKey,
    }: {
        prompt: string;
        history?: ChatMessage[];
        image?: ImageInput;
        apiKey: string;
    }): Promise<string> {
        // 1. إعداد OpenRouter باستخدام المفتاح الممرر
        const openRouter = new OpenRouter({
            apiKey: apiKey,
        });
        // 2. تحويل الـ History من تنسيق Google Gemini إلى تنسيق OpenRouter/OpenAI
        // هذا الجزء ضروري لأن OpenRouter يتوقع هيكلية مختلفة قليلاً
        const convertedHistory: any[] = (history || []).map((msg) => {
            const role = msg.role === "model" ? "assistant" : "user";

            // تجميع النص والصور من الـ parts
            const content = msg.parts.map((part) => {
                if (part.inlineData) {
                    return {
                        type: "image_url",
                        image_url: {
                            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                        },
                    };
                }
                return { type: "text", text: part.text || "" };
            });

            return { role, content };
        });

        // 3. تجهيز الرسالة الحالية (Current Message)
        const currentContent: any[] = [{ type: "text", text: prompt }];

        if (image) {
            currentContent.push({
                type: "image_url",
                image_url: {
                    url: `data:${image.mimeType};base64,${image.data}`,
                },
            });
        }

        const currentMessage = {
            role: "user",
            content: currentContent,
        };

        // 4. دمج كل الرسائل وإرسال الطلب
        const messages = [...convertedHistory, currentMessage];

        try {
            const completion = await openRouter.chat.send({
                model: this.modelName,
                messages: messages,
            });

            // إرجاع النص فقط كما كان في الكود الأصلي
            return (completion.choices[0]?.message?.content as string) || "";
        } catch (error: any) {
            console.error(
                "Error calling OpenRouter API:",
                error.message || error,
            );
            return "";
        }
    }
}

export const geminiModel = new GeminiModel();
