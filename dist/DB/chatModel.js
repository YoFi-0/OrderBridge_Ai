import { DataTypes, Model } from "sequelize";
import { sequelize } from "./sequelize.js";
class ChatModel extends Model {
    phone;
    chat;
    product;
    id;
    lastTimeSendMsg;
    createdAt;
    updatedAt;
}
ChatModel.init({
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
}, {
    sequelize,
    tableName: "chats", // The table name in the DB
});
export default ChatModel;
//# sourceMappingURL=chatModel.js.map