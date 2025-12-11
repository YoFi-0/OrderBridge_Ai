import { type ChatMessage } from "../models/gemini.js";
import type { Product } from "../products/types.js";
interface ClassificationData {
    category: ClassificationType;
    note: string;
    userMsg: string;
}
type ClassificationType = "question_about_previous_product" | "question_about_new_product" | "global_questions" | "order_question" | "order_confirmation" | "transfer_to_worker";
declare class Classification {
    static Search(userMsg: string, preChat: ChatMessage[], apiKey: string): Promise<ClassificationData>;
    static QustionAboutNewProduct(userMsg: string, preChat: ChatMessage[], socketId: string, apiKey: string): Promise<{
        msg: string;
        product: Product;
        prompt: string;
    }>;
    static QuestionAboutPreviousProduct(userMsg: string, preChat: ChatMessage[], product: Product, apiKey: string): Promise<{
        msg: string;
        product: Product;
        prompt: string;
    }>;
    static GlobalQuestions(userMsg: string, preChat: ChatMessage[], product: Product, // يمكننا إبقاء المنتج في السياق لو سأل العميل "هل تشحنون هذا المنتج للرياض؟"
    apiKey: string): Promise<{
        msg: string;
        product: Product;
        prompt: string;
    }>;
    static OrderQuestion(userMsg: string, preChat: ChatMessage[], product: Product, apiKey: string): Promise<{
        msg: string;
        product: Product;
        prompt: string;
    }>;
    static OrderConfirmation(userMsg: string, preChat: ChatMessage[], product: any, apiKey: string, customerPhone: string): Promise<{
        status: any;
        msg: any;
        workeraimsg: any;
        product: any;
        prompt: string;
    }>;
    static TransferToWorker(userMsg: string, preChat: ChatMessage[], product: any, clientPhoneNumber: string, // <--- رقم العميل هنا
    apiKey: string): Promise<{
        status: any;
        msg: any;
        workeraimsg: any;
        product: any;
        prompt: string;
    }>;
}
export default Classification;
//# sourceMappingURL=classAlgo.d.ts.map