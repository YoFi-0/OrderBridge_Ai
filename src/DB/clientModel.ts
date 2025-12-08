import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "./sequelize.js";

interface IClientModel {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  apiKey: string;
  name: string;
  isBan?: boolean;
  phoneNumber: string;
}
interface IClientModelInput
  extends Optional<IClientModel, "id" | "createdAt" | "updatedAt"> {}

class ClientModel
  extends Model<IClientModel, IClientModelInput>
  implements IClientModel
{
  public readonly id!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public apiKey!: string;
  public name!: string;
  public phoneNumber!: string;
  public isBan?: boolean;
}

ClientModel.init(
  {
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
  },
  {
    sequelize,
    tableName: "clients", // The table name in the DB
  },
);

export default ClientModel;
