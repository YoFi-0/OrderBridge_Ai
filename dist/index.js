import { httpServer } from "./http/index.js";
import { geminiModel } from "./models/gemini.js";
import { sequelize } from "./DB/sequelize.js";
import ChatModel from "./DB/chatModel.js";
import ClientModel from "./DB/clientModel.js";
httpServer.listen(8000, async () => {
    await sequelize.authenticate();
    await ChatModel.sync();
    await ClientModel.sync();
    console.log("Local Database Connection has been established successfully.");
    await ChatModel.destroy({
        where: {}, // An empty WHERE clause means 'match all rows'
        truncate: true, // This is the key: it uses a TRUNCATE TABLE command for efficiency (if supported by the dialect)
    });
    console.log(`http://127.0.0.1:${8000}`);
});
//# sourceMappingURL=index.js.map