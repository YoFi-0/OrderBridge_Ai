import { type ChatMessage } from "../models/gemini.js";
import type { Product } from "../products/types.js";
interface ClassificationData {
    category: ClassificationType;
    note: string;
    userMsg: string;
}
type ClassificationType = "question_about_previous_product" | "question_about_new_product" | "global_questions" | "order_question" | "order_confirmation" | "transfer_to_worker";
declare class Classification {
    static Search(userMsg: string, preChat: ChatMessage[], apiKey: string, hasActiveProduct: boolean): Promise<ClassificationData>;
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
    static GlobalQuestions(userMsg: string, preChat: ChatMessage[], product: Product | null, apiKey: string): Promise<{
        msg: string;
        product: Product | null;
        prompt: string;
    }>;
    static OrderQuestion(userMsg: string, preChat: ChatMessage[], product: any, apiKey: string): Promise<{
        msg: string;
        product: any;
        prompt: string;
    }>;
    static OrderConfirmation(userMsg: string, preChat: ChatMessage[], product: any, apiKey: string, customerPhone: string): Promise<{
        status: any;
        msg: any;
        workeraimsg: any;
        product: any;
        prompt: string;
    }>;
    static TransferToWorker(userMsg: string, preChat: ChatMessage[], product: any, clientPhoneNumber: string, apiKey: string): Promise<{
        status: string;
        msg: string;
        workeraimsg: string;
        product: any;
        prompt: string;
    }>;
}
export default Classification;
//# sourceMappingURL=classAlgo.d.ts.map