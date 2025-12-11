import axios from "axios";
import dotenv from "dotenv";
import { geminiModel } from "./gemini.js";
import Classification from "../Algos/classAlgo.js";
// 👇 تأكد أن المسار هنا يطابق مكان ملف المودل عندك
import ChatModel from "../DB/chatModel.js";
import { tempSocket } from "../http/index.js";
import { sleep } from "../Algos/Algo_Find.js";
dotenv.config();
class WhatsApp {
    async SendMsg(payload, token, phoneNumberId) {
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
        try {
            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("❌ API Error:", error.response?.data || error.message);
            }
            else {
                console.error("❌ Unexpected Error:", error);
            }
        }
    }
    async GetWebHook(req, res) {
        const mode = req.query["hub.mode"];
        const incomingToken = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (mode && incomingToken) {
            const matchingClient = tempSocket.find((client) => client.whatsAppVerifyToken === incomingToken);
            if (mode === "subscribe" && matchingClient) {
                console.log(`WEBHOOK_VERIFIED for Client Socket: ${matchingClient.socketId}`);
                res.status(200).send(challenge);
            }
            else {
                console.log("❌ Webhook Verification Failed: Token mismatch");
                res.sendStatus(403);
            }
        }
        else {
            res.sendStatus(400);
        }
    }
    async SendToWorkers(obj, workersList, token, phoneNumberId, msg) {
        for (const worker of workersList) {
            if (worker.includes("x")) {
                continue;
            }
            obj.SendMsg(SendedData.SendMessagetData(msg, worker), token, phoneNumberId);
            await sleep(1000);
        }
    }
    async PostWebHook(obj, req, res) {
        if (!req.body.object) {
            res.sendStatus(404);
            return;
        }
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];
        const metadata = value?.metadata;
        res.sendStatus(200);
        const myPhoneNumber = metadata?.display_phone_number;
        const tempSocketData = tempSocket.find((x) => x.phoneNumber == myPhoneNumber);
        if (!tempSocketData) {
            console.log("SocketId For Phone Number Is Not Found: ", myPhoneNumber, tempSocket);
            return;
        }
        const socketId = tempSocketData.socketId;
        // ============================================================
        //  معالجة الرسائل النصية (Text Messages)
        // ============================================================
        if (message && message.type === "text") {
            const from = message.from;
            const incomingText = message.text.body;
            console.log(`📩 New Message from ${from}: ${incomingText}`);
            try {
                // 1. جلب بيانات المستخدم من قاعدة البيانات
                let userRecord = await ChatModel.findOne({
                    where: { phone: from },
                });
                // 🔥 Check Session Timeout (30 mins)
                if (userRecord && userRecord.lastTimeSendMsg) {
                    const lastTime = new Date(userRecord.lastTimeSendMsg).getTime();
                    const currentTime = new Date().getTime();
                    const diffInMinutes = (currentTime - lastTime) / (1000 * 60);
                    if (diffInMinutes > 30) {
                        await ChatModel.destroy({ where: { phone: from } });
                        userRecord = null; // Reset to treat as new user
                    }
                }
                // Convert to Plain Object if exists (optional but safe for accessing .chat)
                if (userRecord) {
                    userRecord = userRecord.get();
                }
                // 2. تجهيز الشات والمنتج الحالي
                const currentChat = userRecord?.chat
                    ? userRecord.chat
                    : [];
                const currentProduct = userRecord?.product;
                let aiMsg = null;
                const classification = await Classification.Search(incomingText, currentChat, tempSocketData.openRouterKey);
                // 4. التوجيه
                if (classification.category == "question_about_previous_product") {
                    if (!currentProduct) {
                        aiMsg = await Classification.GlobalQuestions(incomingText, currentChat, currentProduct, tempSocketData.openRouterKey);
                    }
                    aiMsg = await Classification.QuestionAboutPreviousProduct(incomingText, currentChat, currentProduct, tempSocketData.openRouterKey);
                }
                else if (classification.category == "question_about_new_product") {
                    aiMsg = await Classification.QustionAboutNewProduct(incomingText, currentChat, socketId, tempSocketData.openRouterKey);
                }
                else if (classification.category == "global_questions") {
                    aiMsg = await Classification.GlobalQuestions(incomingText, currentChat, currentProduct, tempSocketData.openRouterKey);
                }
                else if (classification.category == "order_question") {
                    if (!currentProduct) {
                        aiMsg = await Classification.GlobalQuestions(incomingText, currentChat, currentProduct, tempSocketData.openRouterKey);
                    }
                    else {
                        aiMsg = await Classification.OrderQuestion(incomingText, currentChat, currentProduct, tempSocketData.openRouterKey);
                    }
                }
                else if (classification.category == "order_confirmation") {
                    if (!currentProduct) {
                        aiMsg = await Classification.GlobalQuestions(incomingText, currentChat, currentProduct, tempSocketData.openRouterKey);
                    }
                    else {
                        aiMsg = await Classification.OrderConfirmation(incomingText, currentChat, currentProduct, tempSocketData.openRouterKey, from);
                        obj.SendToWorkers(obj, tempSocketData.workersPhoneNumbers, tempSocketData.whatsAppKey, tempSocketData.whatsAppPhoneNumberId, aiMsg.workeraimsg);
                    }
                }
                else if (classification.category == "transfer_to_worker") {
                    aiMsg = await Classification.TransferToWorker(incomingText, currentChat, currentProduct, from, tempSocketData.openRouterKey);
                    obj.SendToWorkers(obj, tempSocketData.workersPhoneNumbers, tempSocketData.whatsAppKey, tempSocketData.whatsAppPhoneNumberId, aiMsg.workeraimsg);
                }
                const responseText = aiMsg.msg;
                const newProduct = aiMsg.product;
                // 5. حفظ البيانات في قاعدة البيانات
                const userMessageItem = {
                    role: "user",
                    parts: [{ text: incomingText }],
                };
                const modelMessageItem = {
                    role: "model",
                    parts: [{ text: responseText }],
                };
                if (!userRecord) {
                    // --- إنشاء مستخدم جديد ---
                    await ChatModel.create({
                        phone: from,
                        chat: [userMessageItem, modelMessageItem],
                        product: newProduct,
                        lastTimeSendMsg: new Date(), // ✅ New interaction time
                    });
                }
                else {
                    // --- تحديث مستخدم موجود ---
                    const updatedChat = [
                        ...userRecord.chat,
                        userMessageItem,
                        modelMessageItem,
                    ];
                    await ChatModel.update({
                        chat: updatedChat,
                        product: newProduct || userRecord.product,
                        lastTimeSendMsg: new Date(), // ✅ Update interaction time
                    }, {
                        where: { phone: from },
                    });
                }
                // 6. إرسال الرد للواتساب
                obj.SendMsg(SendedData.SendMessagetData(responseText, from), tempSocketData.whatsAppKey, tempSocketData.whatsAppPhoneNumberId);
                console.log("SENDING MESSAGE");
            }
            catch (error) {
                console.error("Failed to reply:", error);
            }
            // ============================================================
            //  معالجة الصور (Image Messages)
            // ============================================================
        }
        else if (message && message.type === "image") {
            res.sendStatus(200);
            const from = message.from;
            try {
                // 1. جلب المستخدم
                let userRecordDB = await ChatModel.findOne({
                    where: { phone: from },
                });
                let userRecord = userRecordDB?.get();
                // 🔥 Check Session Timeout (30 mins) for Images too
                if (userRecord && userRecord.lastTimeSendMsg) {
                    const lastTime = new Date(userRecord.lastTimeSendMsg).getTime();
                    const currentTime = new Date().getTime();
                    const diffInMinutes = (currentTime - lastTime) / (1000 * 60);
                    if (diffInMinutes > 30) {
                        console.log(`User ${from} session expired (>30 mins). Resetting context.`);
                        await ChatModel.destroy({ where: { phone: from } });
                        userRecord = null;
                    }
                }
                const currentChat = userRecord?.chat
                    ? userRecord.chat
                    : [];
                const imageId = message.image.id;
                // --- تحميل الصورة ---
                const metadataUrl = `https://graph.facebook.com/v21.0/${imageId}`;
                const metadataResponse = await axios.get(metadataUrl, {
                    headers: {
                        Authorization: `Bearer ${tempSocketData.whatsAppKey}`,
                    },
                });
                const actualImageUrl = metadataResponse.data.url;
                const mimeType = metadataResponse.data.mime_type || "image/jpeg";
                const imageResponse = await axios.get(actualImageUrl, {
                    responseType: "arraybuffer",
                    headers: {
                        Authorization: `Bearer ${tempSocketData.whatsAppKey}`,
                    },
                });
                const base64Image = Buffer.from(imageResponse.data).toString("base64");
                const imageInput = { mimeType: mimeType, data: base64Image };
                // --- إرسال لـ Gemini ---
                const dataWithImage = await geminiModel.SendMessage({
                    prompt: "اعطني رقم المعرف اللي في الصورة فقط",
                    history: currentChat,
                    image: imageInput,
                    apiKey: tempSocketData.openRouterKey,
                });
                // --- معالجة الرد عبر الخوارزمية ---
                const aiMsg = await Classification.QustionAboutNewProduct(dataWithImage, currentChat, socketId, tempSocketData.openRouterKey);
                // --- إرسال الرد للواتساب ---
                obj.SendMsg(SendedData.SendMessagetData(aiMsg.msg, from), tempSocketData.whatsAppKey, tempSocketData.whatsAppPhoneNumberId);
                // --- الحفظ في قاعدة البيانات ---
                const promptText = aiMsg.prompt || "Image Request";
                const userMsgObj = {
                    role: "user",
                    parts: [{ text: promptText }],
                };
                const modelMsgObj = {
                    role: "model",
                    parts: [{ text: aiMsg.msg }],
                };
                if (!userRecord) {
                    await ChatModel.create({
                        phone: from,
                        chat: [userMsgObj, modelMsgObj],
                        product: aiMsg.product || null,
                        lastTimeSendMsg: new Date(), // ✅ New interaction time
                    });
                }
                else {
                    const updatedChat = [
                        ...userRecord.chat,
                        userMsgObj,
                        modelMsgObj,
                    ];
                    await ChatModel.update({
                        chat: updatedChat,
                        product: aiMsg.product || userRecord.product,
                        lastTimeSendMsg: new Date(), // ✅ Update interaction time
                    }, {
                        where: { phone: from },
                    });
                }
                // ✅ userRecord.save() REMOVED to prevent crash
            }
            catch (error) {
                console.error("Error processing image:", error);
            }
        }
    }
}
export const whatsApp = new WhatsApp();
export class SendedData {
    static SendMessagetData(message, phoneNumber) {
        const data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneNumber,
            type: "text",
            text: {
                body: message,
            },
        };
        return data;
    }
    static SendImageLinktData(link, phoneNumber, caption) {
        const data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneNumber,
            type: "image",
            image: {
                link: link,
                caption,
            },
        };
        return data;
    }
    static SendImageFiletData(filPath, phoneNumber) { }
    static T_hello_world(phoneNumber, lang) {
        const data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneNumber,
            type: "template",
            template: {
                name: "hello_world",
                language: {
                    code: lang,
                },
            },
        };
        return data;
    }
}
//# sourceMappingURL=whatsApp.js.map