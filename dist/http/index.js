import express from "express";
import session from "express-session";
import http from "http";
// Augment the Request interface
import { whatsApp } from "../models/whatsApp.js";
import ClientModel from "../DB/clientModel.js";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import { Server } from "socket.io";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(session({
    secret: "my-secret-key", // كلمة سر لتشفير الجلسة (غيّرها لشيء معقد)
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // اجعلها true فقط إذا كنت تستخدم https
}));
app.post("/webhook", (req, res) => whatsApp.PostWebHook(whatsApp, req, res));
app.get("/webhook", (req, res) => whatsApp.GetWebHook(req, res));
app.get("/test", (req, res) => {
    res.send("Http Server Is Running");
});
const isLogin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.isAdmin) {
        next();
        return;
    }
    res.redirect("/login");
};
const username = "admin";
const password = "admin";
app.get("/login", (req, res) => {
    res.render("login", {
        errorMsg: "",
    });
});
app.get("/admin", isLogin, (req, res) => {
    res.render("admin");
});
app.post("/login", (req, res) => {
    if (req.body.username == username && req.body.password == password) {
        req.session.user = {
            username: req.body.username,
            isAdmin: true,
        };
        res.redirect("/admin");
        return;
    }
    res.render("login", {
        errorMsg: "Invalid username or password",
    });
});
// 1. READ: عرض جدول العملاء (الصفحة الرئيسية للعملاء)
app.get("/clients", isLogin, async (req, res) => {
    try {
        const clients = await ClientModel.findAll({
            order: [["createdAt", "DESC"]], // ترتيب حسب الأحدث
        });
        // نمرر البيانات إلى ملف العرض clients/index
        res.render("clients/index", {
            clients: clients.map((x) => x.get()),
        });
    }
    catch (error) {
        console.error(error);
        res.render("error", { message: "حدث خطأ أثناء جلب البيانات" });
    }
});
// 2. CREATE (Form): عرض صفحة إنشاء عميل جديد
app.get("/clients/create", isLogin, (req, res) => {
    res.render("clients/create");
});
const generateApiKey = (length = 32) => {
    // قائمة الحروف والأرقام المسموح استخدامها
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        // نختار حرف عشوائي من القائمة ونضيفه للنتيجة
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars.charAt(randomIndex);
    }
    return result;
};
// 3. CREATE (Action): استقبال بيانات الفورم وحفظها
app.post("/clients/store", isLogin, async (req, res) => {
    try {
        // 1. نستقبل فقط الاسم والرقم (حذفنا apiKey من هنا)
        const { name, phoneNumber } = req.body;
        if (!name || !phoneNumber) {
            throw new Error("أكمل كل الحقول");
        }
        // 2. نقوم بتوليد كود عشوائي (Token) مكون من حروف وأرقام
        // الرقم 24 يعني عدد البايتات، toString('hex') يحولها لنص مقروء
        const generatedApiKey = generateApiKey();
        await ClientModel.create({
            name,
            phoneNumber,
            apiKey: generatedApiKey,
        });
        // بعد الحفظ، نرجع لصفحة القائمة
        res.redirect("/clients");
    }
    catch (error) {
        console.error(error);
        res.render("clients/create", {
            error: "فشل إنشاء العميل، تأكد من البيانات",
        });
    }
});
// 4. UPDATE (Form): عرض صفحة التعديل مع بيانات العميل الحالية
app.get("/clients/edit/:id", isLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await ClientModel.findByPk(id);
        if (!client) {
            return res
                .status(404)
                .render("error", { message: "العميل غير موجود" });
        }
        res.render("clients/edit", { client: client.get() });
    }
    catch (error) {
        console.error(error);
        res.render("error", { message: "حدث خطأ ما" });
    }
});
// 5. UPDATE (Action): استقبال التعديلات وحفظها
app.post("/clients/update/:id", isLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phoneNumber, apiKey, GeminiKey, WhatsAppKey, isBan } = req.body;
        await ClientModel.update({
            name,
            phoneNumber,
            apiKey,
            isBan: isBan === "true",
        }, { where: { id } });
        if (isBan === "true") {
            ioDisconnectSocket(tempSocket.find((x) => x.phoneNumber == phoneNumber)
                ?.socketId || "");
        }
        res.redirect("/clients");
    }
    catch (error) {
        console.error(error);
        res.redirect(`/clients/edit/${req.params.id}`);
    }
});
// 6. DELETE (Action): حذف العميل
// ملاحظة: نستخدم POST لأن HTML Forms لا تدعم DELETE مباشرة بدون مكتبات إضافية
app.post("/clients/delete/:id", isLogin, async (req, res) => {
    try {
        const { id } = req.params;
        await ClientModel.destroy({
            where: { id },
        });
        res.redirect("/clients");
    }
    catch (error) {
        console.error(error);
        res.redirect("/clients");
    }
});
app.post("/test_user", async (req, res) => {
    const { key } = req.body;
    if (!key) {
        res.status(404).send();
    }
    const user = await ClientModel.findOne({ where: { apiKey: key } });
    if (user) {
        res.status(200).send({
            ok: true,
        });
        return;
    }
    res.status(404).send();
});
export const httpServer = http.createServer(app);
const io = new Server(httpServer);
export const ioSearch = (socketId, userMsg) => {
    console.log("search socket is running !!");
    io.to(socketId).emit("search", userMsg);
};
export const ioDisconnectSocket = (socketId) => {
    if (!socketId) {
        return;
    }
    io.sockets.sockets.get(socketId)?.disconnect();
};
export let tempSocket = [];
export const ioOnProductFound = async (socketId) => {
    console.log("product_found socket is starting !!");
    const product = await new Promise((resolve) => {
        setTimeout(() => {
            resolve(undefined);
        }, 50000);
        io.sockets.sockets
            .get(socketId)
            ?.once("product_found", (data) => {
            console.log("product_found socket is running !!", data);
            resolve(data);
        });
    });
    console.log("product_found socket is ended !!");
    return product;
};
io.on("connection", async (socket) => {
    console.log(`✅ A user connected! Socket ID: ${socket.id}`);
    socket.emit("id", socket.id);
    socket.on("temp_save", async (data) => {
        const isFound = await ClientModel.findOne({
            where: {
                apiKey: data.apiKey,
                phoneNumber: data.phoneNumber,
            },
        });
        if (!isFound) {
            socket.emit("server_error", "invalid credentials");
            return;
        }
        if (isFound.get().isBan) {
            socket.emit("server_error", "you have no access to our service contact with support !!");
        }
        tempSocket.push({
            socketId: socket.id,
            phoneNumber: data.phoneNumber,
            apiKey: data.apiKey,
            whatsAppKey: data.whatsAppKey,
            whatsAppVerifyToken: data.whatsAppVerifyToken,
            whatsAppPhoneNumberId: data.whatsAppPhoneNumberId,
            openRouterKey: data.openRouterKey,
        });
    });
    // Handle disconnection
    socket.on("disconnect", () => {
        tempSocket = tempSocket.filter((x) => x.socketId != socket.id);
        console.log("❌ User disconnected:", socket.id);
    });
});
//# sourceMappingURL=index.js.map