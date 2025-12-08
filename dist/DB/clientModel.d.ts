import { Model, type Optional } from "sequelize";
interface IClientModel {
    id: number;
    createdAt?: Date;
    updatedAt?: Date;
    apiKey: string;
    name: string;
    isBan?: boolean;
    phoneNumber: string;
}
interface IClientModelInput extends Optional<IClientModel, "id" | "createdAt" | "updatedAt"> {
}
declare class ClientModel extends Model<IClientModel, IClientModelInput> implements IClientModel {
    readonly id: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    apiKey: string;
    name: string;
    phoneNumber: string;
    isBan?: boolean;
}
export default ClientModel;
//# sourceMappingURL=clientModel.d.ts.map