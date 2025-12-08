import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "./sequelize.js";
import type { ChatMessage } from "../models/gemini.js";
import type { Product } from "../products/types.js";

// في ملف types.js أو نفس الملف
interface IChatModel {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastTimeSendMsg: Date; // 👈 الخاصية الجديدة
  phone: string;
  chat: ChatMessage[];
  product?: Product | null;
}
interface IChatModelInput
  extends Optional<IChatModel, "id" | "createdAt" | "updatedAt"> {}

class ChatModel
  extends Model<IChatModel, IChatModelInput>
  implements IChatModel
{
  phone!: string;
  chat!: ChatMessage[];
  product?: Product;
  public readonly id!: number;
  public lastTimeSendMsg!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ChatModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    lastTimeSendMsg: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    chat: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    product: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "chats", // The table name in the DB
  },
);

export default ChatModel;
