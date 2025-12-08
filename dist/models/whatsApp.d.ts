import type { Request, Response } from "express";
type Languages = "en_US" | "ar_SA";
interface WhatsAppMessagePayload {
    messaging_product: "whatsapp";
    recipient_type?: "individual";
    to: string;
    type: "text" | "template" | "interactive" | "image" | "document" | "audio" | "video" | "sticker" | "location";
    text?: {
        preview_url?: boolean;
        body: string;
    };
    template?: {
        name: string;
        language: {
            code: Languages;
        };
    };
    image?: {
        link: string;
        caption?: string;
        filename?: string;
        provider?: "whatsapp" | "facebook" | "instagram" | "messenger" | "telegram";
        id?: string;
    };
}
declare class WhatsApp {
    SendMsg(payload: WhatsAppMessagePayload, token: string, phoneNumberId: string): Promise<void>;
    GetWebHook(req: Request, res: Response): Promise<void>;
    PostWebHook(obj: WhatsApp, req: Request, res: Response): Promise<void>;
}
export declare const whatsApp: WhatsApp;
export declare class SendedData {
    static SendMessagetData(message: string, phoneNumber: string): WhatsAppMessagePayload;
    static SendImageLinktData(link: string, phoneNumber: string, caption: string): WhatsAppMessagePayload;
    static SendImageFiletData(filPath: string, phoneNumber: string): void;
    static T_hello_world(phoneNumber: string, lang: Languages): WhatsAppMessagePayload;
}
export {};
//# sourceMappingURL=whatsApp.d.ts.map