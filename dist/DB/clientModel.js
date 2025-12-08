import { DataTypes, Model } from "sequelize";
import { sequelize } from "./sequelize.js";
class ClientModel extends Model {
    id;
    createdAt;
    updatedAt;
    apiKey;
    name;
    phoneNumber;
    isBan;
}
ClientModel.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    phoneNumber: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
    },
    isBan: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    apiKey: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize,
    tableName: "clients", // The table name in the DB
});
export default ClientModel;
//# sourceMappingURL=clientModel.js.map