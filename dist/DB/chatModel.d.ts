import { Model, type Optional } from "sequelize";
import type { ChatMessage } from "../models/gemini.js";
import type { Product } from "../products/types.js";
interface IChatModel {
    id: number;
    createdAt?: Date;
    updatedAt?: Date;
    lastTimeSendMsg: Date;
    phone: string;
    chat: ChatMessage[];
    product?: Product | null;
}
interface IChatModelInput extends Optional<IChatModel, "id" | "createdAt" | "updatedAt"> {
}
declare class ChatModel extends Model<IChatModel, IChatModelInput> implements IChatModel {
    phone: string;
    chat: ChatMessage[];
    product?: Product;
    readonly id: number;
    lastTimeSendMsg: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default ChatModel;
//# sourceMappingURL=chatModel.d.ts.map