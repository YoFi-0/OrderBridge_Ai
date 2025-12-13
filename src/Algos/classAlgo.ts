import { getCompanyInfo } from "../company/companyData.js";
import { ioOnProductFound, ioSearch } from "../http/index.js";
import { geminiModel, type ChatMessage } from "../models/gemini.js"; // تأكد أن الموديل هنا هو gpt-4o-mini
import type { Product } from "../products/types.js";

interface ClassificationData {
  category: ClassificationType;
  note: string;
  userMsg: string;
}

type ClassificationType =
  | "question_about_previous_product"
  | "question_about_new_product"
  | "global_questions"
  | "order_question"
  | "order_confirmation"
  | "transfer_to_worker";

class Classification {
  // 🔥 التعديل 1: إضافة hasActiveProduct لمعرفة هل يوجد منتج في السياق
  public static async Search(
    userMsg: string,
    preChat: ChatMessage[],
    apiKey: string,
    hasActiveProduct: boolean,
  ): Promise<ClassificationData> {
    // تحويل المحادثة السابقة لنص مقروء
    const historyText = preChat
      .slice(-4) // نأخذ آخر 4 رسائل لزيادة الدقة
      .map(
        (m) =>
          `${m.role === "user" ? "العميل" : "البوت"}: ${m.parts[0]?.text || ""}`,
      )
      .join("\n");

    const prompt = `
# Role
You are a smart Saudi Warehouse Agent (Hejazi Dialect) for a Wallpaper Supplier.
Your ONLY job is to classify the User's Intent based on the context.

# Current Context State
**Is User Holding a Product?** ${hasActiveProduct ? "YES (Focus on this product)" : "NO (No product selected)"}

# Categories & Strict Rules

1. **"question_about_previous_product"**
   - TRIGGER: User asks about price, specs, size, or availability of the *currently selected product*.
   - **CRITICAL CONDITION:** Only use this if "Is User Holding a Product?" is **YES**.
   - EXAMPLES: "بكم هذا؟", "كم مقاسه؟", "متوفر منه؟", "طيب ينفع للمطبخ؟".

2. **"question_about_new_product"**
   - TRIGGER: User sends a Product Code, Image, or asks "Do you have [Specific Type/Code]?".
   - **CRITICAL:** Use this if user switches topic to a NEW item.
   - EXAMPLES: "عندكم كود 505؟", "ابغى ورق مشجر", "فيه لون رمادي؟", (User sends Image).

3. **"global_questions"**
   - TRIGGER: Greetings, General location/shipping questions, or generic phrases.
   - **TRAP:** "عندكم ورق جدران؟" (Generic) -> Global. BUT "عندكم ورق جدران مودرن؟" (Specific) -> New Product.
   - EXAMPLES: "سلام عليكم", "وين موقعكم", "كيف التوصيل", "وش تبيعون؟".

4. **"order_question"**
   - TRIGGER: User shows INTENT TO BUY specific quantity.
   - KEYWORDS: "ابغى 5 حبات", "احجز لي", "بكم الـ 10 رولات؟".

5. **"order_confirmation"**
   - TRIGGER: User accepts the deal OR agrees to the invoice.
   - **CRITICAL KEYWORDS:** "اي", "ايه", "نعم", "تم", "اعتمد", "توكلنا", "يلا", "Yes", "Ok".
   - **LOGIC:** If the PREVIOUS BOT MESSAGE was asking for confirmation (e.g., "نعتمد؟"), and user says "اي" -> IT IS CONFIRMATION.

6. **"transfer_to_worker"**
   - TRIGGER: User is angry, confused, or asks for human.
   - KEYWORDS: "كلمني انت", "ما افهم عليك", "ناد الموظف", "يا هووه".

# Few-Shot Examples (Follow Logic)

Input (No Product): "عندكم ورق جدران؟"
Output: {"category": "global_questions", "note": "General inquiry"}

Input (No Product): "ابغى موديل 9090"
Output: {"category": "question_about_new_product", "note": "Searching specific code"}

Input (Has Product): "بكم المتر؟"
Output: {"category": "question_about_previous_product", "note": "Context implies current product"}

Input (Has Product): "طيب وريني شي ثاني"
Output: {"category": "question_about_new_product", "note": "Switching intent"}

# User Message
"${userMsg}"

# Output
Return ONLY strict JSON.
    `;

    try {
      // نفترض هنا أن geminiModel يستدعي gpt-4o-mini داخلياً
      const dataStr = await geminiModel.SendMessage({
        prompt: prompt,
        history: [], // الهيستوري مدمج في البرومبت لضمان التنسيق
        apiKey,
      });

      const cleanedStr = dataStr.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleanedStr);

      return {
        category: data.category as ClassificationType,
        note: data.note || "",
        userMsg: userMsg,
      };
    } catch (error) {
      console.error("❌ Classification Failed:", error);
      // Fallback آمن
      return {
        category: "global_questions",
        note: "Fallback Error",
        userMsg: userMsg,
      };
    }
  }

  // --- دوال المعالجة (Handlers) ---

  public static async QustionAboutNewProduct(
    userMsg: string,
    preChat: ChatMessage[],
    socketId: string,
    apiKey: string,
  ) {
    let product: Product | null | undefined = null;

    // محاكاة البحث (تأكد أن السوكيت يعمل بشكل صحيح)
    ioSearch(socketId, userMsg);
    product = await ioOnProductFound(socketId);

    const isFound = product && product !== null;
    const rawData = isFound ? JSON.stringify(product) : "NULL";

    const prompt = `
    You are a polite Saudi Salesman (Hejazi Dialect).
    User searched for: "${userMsg}"

    **Database Result:**
    ${rawData}

    **Instruction:**
    1. **If Found (Quantity > 0):** Say: "يا هلا، الموديل [Name] موجود طال عمرك. السعر [Price] ريال. كم حبة تحتاج؟"
    2. **If Found (Quantity = 0):** Say: "المعذرة يا غالي، الموديل [Name] مخلص حالياً. تحب نشوف لك شي مشابه؟"
    3. **If NOT Found (NULL):** Say: "المعذرة منك، هذا الكود مو طالع عندي بالنظام. ممكن تتأكد من الرقم أو ترسل صورة الباركود؟"

    **Rule:** Be concise. No English. Use "يا هلا", "طال عمرك".
    `;

    const aiMsg = await geminiModel.SendMessage({
      prompt: prompt,
      history: [], // لا نحتاج هيستوري طويل هنا، الرد فوري
      apiKey,
    });

    return { msg: aiMsg, product: product, prompt };
  }

  public static async QuestionAboutPreviousProduct(
    userMsg: string,
    preChat: ChatMessage[],
    product: Product,
    apiKey: string,
  ) {
    const prompt = `
    You are a Saudi Salesman (Hejazi Dialect).
    **Product Context:** ${JSON.stringify(product)}
    **User Question:** "${userMsg}"

    **Instructions:**
    1. If user asks about **Material/Origin/Shape** ("من ايش؟", "صناعة وين؟", "كيف شكله؟"):
       - Answer based purely on the JSON details (description, material, origin).
       - DO NOT mention quantity or stock here.

    2. If user asks about **Availability** ("متوفر؟", "باقي منه؟"):
       - ONLY THEN check quantity.

    3. Keep it friendly and short.
    `;

    const aiMsg = await geminiModel.SendMessage({
      prompt: prompt,
      history: preChat.slice(-2), // هيستوري قصير للتركيز
      apiKey,
    });
    return { msg: aiMsg, product: product, prompt };
  }

  public static async GlobalQuestions(
    userMsg: string,
    preChat: ChatMessage[],
    product: Product | null,
    apiKey: string,
  ) {
    const companyData = await getCompanyInfo();

    const prompt = `
    You are a Saudi Customer Support agent.
    **Company Info:** ${JSON.stringify(companyData)}
    **User Input:** "${userMsg}"

    **Task:**
    - If greeting: Reply nicely ("يا هلا وسهلا، آمرني").
    - If generic "Do you have wallpaper?": Say "اي نعم عندنا تشكيلة واسعة، ارسل لي كود المنتج أو صورته وابشر".
    - If asking location/hours: Use Company Info.
    - Keep it short.
    `;

    const aiMsg = await geminiModel.SendMessage({
      prompt: prompt,
      history: preChat.slice(-2),
      apiKey,
    });
    return { msg: aiMsg, product: product, prompt };
  }

  public static async OrderQuestion(
    userMsg: string,
    preChat: ChatMessage[],
    product: any,
    apiKey: string,
  ) {
    // إرسال البيانات "صندوق أسود" للذكاء
    const productJson = JSON.stringify(product);

    const prompt = `
    You are a Smart Saudi Sales Assistant (Hejazi Dialect).

    **INPUTS:**
    1. **User Request:** "${userMsg}"
    2. **Product Data (JSON):** ${productJson}

    **YOUR TASK:**
    1. **Find Stock:** Search JSON for 'quantity', 'stock', 'qty'.
    2. **Find Price:** Search JSON for 'price', 'cost'.
    3. **Find Name:** Search JSON for 'name', 'title'.
    4. **Extract User Quantity:** Parse user text to Integer.

    **LOGIC:**
    - IF (User Quantity > Available Stock) -> **REJECT**.
    - IF (User Quantity <= Available Stock) -> **ACCEPT**.

    **OUTPUT RULES (Strict Saudi Arabic):**

    **Scenario 1: ACCEPTED**
    - Calculate Total = User Quantity * Price.
    - Response: "تمام، طلبك [UserQty] حبة من [Name]. الإجمالي: [Total] ريال. نعتمد الفاتورة يا غالي؟"

    **Scenario 2: REJECTED (Not enough stock)**
    - **CRITICAL:** DO NOT mention the exact remaining stock number.
    - Response: "المعذرة يا غالي، الكمية هذي مو متوفرة كاملة حالياً.
      تحب تاخذ عدد أقل ولا تشوف موديل ثاني؟"

    **Constraint:** Return ONLY the final Arabic message.
    `;

    const aiMsg = await geminiModel.SendMessage({
      prompt: prompt,
      history: preChat.slice(-2),
      apiKey,
    });

    return { msg: aiMsg, product: product, prompt };
  }

  public static async OrderConfirmation(
    userMsg: string,
    preChat: ChatMessage[],
    product: any,
    apiKey: string,
    customerPhone: string,
  ) {
    // 🔥 1. نرسل الجيسون كما هو "بله" للذكاء بدون ما نلمسه
    const productDataString = JSON.stringify(product);

    // نجهز السياق عشان الذكاء يعرف الكمية
    const historyText = preChat
      .slice(-3)
      .map((m) => `${m.role}: ${m.parts[0]?.text}`)
      .join("\n");

    // 🔥 2. البرومبت هو "الكل في الكل": يحلل، يحسب، وينسق الرسالة
    const prompt = `
    You are a Smart Order Manager.

    **INPUTS:**
    - User Message: "${userMsg}"
    - Chat History: \n${historyText}
    - Product Data (Unknown Structure): ${productDataString}
    - Client Phone: "${customerPhone}"

    **YOUR MISSION:**
    1. **Analyze Status:** Did user confirm?
    2. **Analyze Data:** Dig into the "Product Data" JSON. Find whatever looks like a Name, Price, Code/ID/SKU.
    3. **Analyze Quantity:** Look at "Chat History" to find the agreed quantity.
    4. **Calculate:** Total Price = Quantity * Unit Price.

    **REQUIRED OUTPUT (JSON ONLY):**
    {
      "status": "CONFIRMED" | "CANCELLED",

      "useraimsg": "Write a polite, short Saudi Arabic reply to the user confirming the order.",

      "workeraimsg": "IF CONFIRMED, Write the EXACT Worker Report here. IF CANCELLED, return null."
    }

    **Worker Report Format (Strict Template for workeraimsg):**
    ✅ *طلب جديد مؤكد*
    📱 العميل: wa.me/${customerPhone}
    📦 المنتج: [Insert Product Name Found in JSON]
    🔢 الكود: [Insert Code/SKU Found in JSON]
    📝 الكمية المطلوبة: [Insert Quantity Found in History]
    💰 السعر للمفرد: [Insert Price Found in JSON]
    💵 الإجمالي المتوقع: [Insert Calculated Total]
    ⚠️ ملاحظة: [Any details like Color/Size if found]
    `;

    let aiRawMsg = await geminiModel.SendMessage({
      prompt: prompt,
      history: [], // الهيستوري مدمج في البرومبت
      apiKey,
    });

    aiRawMsg = aiRawMsg.replace(/```json|```/g, "").trim();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiRawMsg);
    } catch (e) {
      // Fallback بسيط جداً في حال فشل الجيسون
      parsedResponse = {
        status: "CONFIRMED",
        useraimsg: "أبشر، تم اعتماد طلبك.",
        workeraimsg: `✅ طلب جديد\nالعميل: ${customerPhone}\nالبيانات: ${productDataString}`,
      };
    }

    return {
      status: parsedResponse.status,
      msg: parsedResponse.useraimsg,
      workeraimsg: parsedResponse.workeraimsg, // 👈 الرسالة جاية جاهزة من الذكاء
      product: product,
      prompt,
    };
  }

  public static async TransferToWorker(
    userMsg: string,
    preChat: ChatMessage[],
    product: any,
    clientPhoneNumber: string,
    apiKey: string,
  ) {
    // منطق التحويل للموظف (كما هو لكن مع التأكد من اللهجة)
    return {
      status: "ESCALATED",
      msg: "ولا يهمك، ثواني وزميلي الموظف بيتواصل معاك يخدمك بعيونه.",
      workeraimsg: `🚨 طلب تدخل بشري\nالعميل: ${clientPhoneNumber}\nالسبب: ${userMsg}`,
      product: product,
      prompt: "Static Transfer",
    };
  }
}

export default Classification;
