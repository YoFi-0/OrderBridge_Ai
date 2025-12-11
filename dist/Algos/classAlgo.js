import { getCompanyInfo } from "../company/companyData.js";
import { ioOnProductFound, ioSearch } from "../http/index.js";
import { geminiModel } from "../models/gemini.js";
import { SearchProductByUserMsg } from "./Algo_Find.js";
class Classification {
    static async Search(userMsg, preChat, apiKey) {
        const prompt = `
# Role
You are an intelligent intent classifier for a Supplier Agent. Your job is to categorize the user's message into one of FIVE categories based on their business intent.

# Categories

1. "question_about_previous_product"
   - TRIGGER: User asks for INFORMATION about the current product (specs, stock, price, material).
   - EXCLUSION: If the user says "I want X pieces" or "Give me X", do NOT use this. Use 'order_question' instead.
   - KEYWORDS: "MOQ", "Price?", "Is it available?", "How many do you have?", "Specs", "Size".

2. "question_about_new_product"
   - TRIGGER: User wants to find/source a DIFFERENT product.
   - KEYWORDS: "Find me...", "Do you have...", "Search for...", "I need a supplier for...", "numbers", "product code".

3. "global_questions"
   - TRIGGER: General questions about services, shipping, payment, location.
   - KEYWORDS: "Commission", "Payment terms", "Where is your office?", "Shipping cost".

4. "order_question"
   - TRIGGER: User expresses a CLEAR INTENT TO BUY or specifies a quantity they want to take/receive.
   - CONTEXT: Moving from "asking" to "acting/buying".
   - KEYWORDS: "Give me 2", "I want 5 rolls", "Book 10 for me", "Send me 3", "اعطيني 2", "ابغى 5", "احجز لي", "خلاص ابغاها".

5. "order_confirmation"
   - TRIGGER: User confirms the final deal after being told the total price.
   - KEYWORDS: "Confirm", "Deal", "Go ahead", "Transfer info", "اعتمد", "تم", "تمام توكلنا على الله".

# Output Format
Respond with a strictly valid JSON object:
- "category": One of the exact strings above.
- "note": A concise summary.

# Examples

Input: "كم حبة باقي عندكم؟"
Output: {"category": "question_about_previous_product", "note": "User checking stock availability only."}

Input: "تمام، اعطيني منها 2"
Output: {"category": "order_question", "note": "User explicitly wants to buy 2 units."}

Input: "ابغى 5 كراتين لو سمحت"
Output: {"category": "order_question", "note": "User requesting a specific quantity to purchase."}

Input: "اعتمد الطلب"
Output: {"category": "order_confirmation", "note": "User confirming the order."}

#client message
${userMsg}
    `;
        const last3Msgs = preChat.slice(-3);
        const dataStr = await geminiModel.SendMessage({
            prompt: prompt,
            history: last3Msgs,
            apiKey,
        });
        const cleanedStr = dataStr.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanedStr);
        return {
            category: data.category,
            note: data.note,
            userMsg: userMsg,
        };
    }
    static async QustionAboutNewProduct(userMsg, preChat, socketId, apiKey) {
        let product = null;
        ioSearch(socketId, userMsg);
        product = await ioOnProductFound(socketId);
        console.log("product found?", product);
        // نحدد هل البيانات موجودة أصلاً أم لا
        const isFound = product !== null && product !== undefined;
        // نرسل الـ JSON كما هو للذكاء ليحلله
        const rawData = isFound ? JSON.stringify(product) : "NULL (No Data Found)";
        const prompt = `
    You are a professional and polite Customer Support Agent communicating in **Arabic** on **WhatsApp**.

    **Input Data (Raw JSON with Unknown Schema):**
    \`\`\`json
    ${rawData}
    \`\`\`

    **Your Task (Data Analysis & Natural Response):**
    1. **Analyze the JSON:** Identify the keys for Name, Price, Barcode, and Quantity.
    2. **Determine Availability:**
       - If Quantity > 0: Status is "Available".
       - If Quantity <= 0 or missing: Status is "Out of Stock".

    3. **Construct the Reply (Strict Formatting Rules):**
       - **NO Emojis:** Do not use any emojis (e.g., 🛑, ✅, 🙏).
       - **NO Markdown/Formatting:** Do not use asterisks (*), underscores (_), bold, or italics. Do not use quotation marks around the message.
       - **Style:** Simple, polite, direct, and professional plain text.

       **Scenarios:**

       * **Scenario A: Product Found & Available:**
           - Greeting.
           - State that the product [Name] is available.
           - Mention the price [Price].
           - Ask if they want to proceed.
           - *Target Example:* "أهلا بك. المنتج [Name] متوفر وسعره [Price] ريال. هل ترغب بإضافته للطلب؟"

       * **Scenario B: Product Found BUT Out of Stock:**
           - Polite apology.
           - State clearly that [Name] is currently unavailable.
           - Offer to check for alternatives.
           - *Target Example:* "نعتذر منك. المنتج [Name] غير متوفر حاليا في المخزون. هل ترغب بالبحث عن بديل مشابه؟"

       * **Scenario C: Product NOT Found (NULL):**
           - Polite apology regarding missing data in the system.
           - Ask for a Barcode image or to check the name.
           - *Target Example:* "عذرا منك، لا توجد بيانات لهذا المنتج في النظام. يرجى تزويدنا بصورة الباركود أو التأكد من الاسم لنتمكن من خدمتك."

    **Important:** Output the final Arabic response ONLY. Do not add any explanations.
    `;
        const aiMsg = await geminiModel.SendMessage({
            prompt: prompt,
            history: preChat,
            apiKey,
        });
        return {
            msg: aiMsg,
            product: product,
            prompt,
        };
    }
    static async QuestionAboutPreviousProduct(userMsg, preChat, product, apiKey) {
        console.log("product", product?.name);
        const prompt = `
  You are a professional Supplier Agent.
  **Context: You are communicating via WhatsApp.**
  **Restriction: Use Saudi dialect only**
  **Constraint: Keep your response very short, concise, and direct.**
  
  You are currently discussing the following product details with a client:
  ${JSON.stringify(product)}

  The client's latest inquiry is: "${userMsg}"

  Your instructions:
  1. **Answer the specific question:** Answer strictly based on the provided product data. If the info is not there, say you don't know.
  2. **Standard Specs:** If the client asks for details/specs generally, provide:
     - Length & Width (الطول والعرض).
     - Area/Coverage (المساحة).
     - Price (السعر).
  3. **Availability Logic (CRITICAL):**
     - Check the 'specific question' The client's latest inquiry .
      - If the user asks for how many pieces are available,
      State exactly "متوفر" (Available).
      then
     - Check the 'quantity' value in the product data.
    State exactly "متوفر" (Available).

  Response Tone: Professional, concise, and in Arabic.

  **Construct the Reply (Strict Formatting Rules):**
   - **NO Emojis:** Do not use any emojis (e.g., 🛑, ✅, 🙏).
   - **NO Markdown/Formatting:** Do not use asterisks (*), underscores (_), bold, or italics. Do not use quotation marks around the message.
    `;
        const aiMsg = await geminiModel.SendMessage({
            prompt: prompt,
            history: preChat,
            apiKey,
        });
        return {
            msg: aiMsg,
            product: product,
            prompt,
        };
    }
    static async GlobalQuestions(userMsg, preChat, product, // يمكننا إبقاء المنتج في السياق لو سأل العميل "هل تشحنون هذا المنتج للرياض؟"
    apiKey) {
        console.log("product", product?.name);
        // 1. جلب بيانات الشركة (JSON)
        // استبدل getCompanyInfo بالدالة الفعلية الموجودة لديك
        const companyData = await getCompanyInfo();
        const prompt = `
    You are a professional Supplier Agent.
    **Context: You are communicating via WhatsApp.**
    **Restriction: Use Saudi dialect only**
    **Constraint: Keep your response very short, concise, and direct.**

    Here is the official Company Information (Truth Source):
    ${JSON.stringify(companyData)}
    
    You are currently discussing the following product details with a client:
    ${JSON.stringify(product)}

    The client asks: "${userMsg}"

    Instructions:
    1. Answer the specific question using ONLY the provided Company Information.
    2. Do NOT invent information. If the answer (e.g., specific shipping price to a city not listed) is not in the data, apologize and say you need to check with administration.
    3. Be concise and direct. Do not write long paragraphs unless necessary.
    4. Reply in Arabic.

    **Construct the Reply (Strict Formatting Rules):**
     - **NO Emojis:** Do not use any emojis (e.g., 🛑, ✅, 🙏).
     - **NO Markdown/Formatting:** Do not use asterisks (*), underscores (_), bold, or italics. Do not use quotation marks around the message.
    `;
        const aiMsg = await geminiModel.SendMessage({
            prompt: prompt,
            history: preChat,
            apiKey,
        });
        return {
            msg: aiMsg,
            product: product,
            prompt,
        };
    }
    static async OrderQuestion(userMsg, preChat, product, apiKey) {
        console.log("Processing Order Quantity for:", product?.name);
        const prompt = `
  You are a Sales Agent finalizing a deal.
  **Context: You are communicating via WhatsApp.**
  **Restriction: Use Saudi dialect only**
  **Constraint: Keep your response very short, concise, and direct.**

  Current Product Data:
  ${JSON.stringify(product)}

  User's Request: "${userMsg}"

  Your Goal:
  1. **Extract Quantity:** Identify how many items the user wants from their message.
  2. **Check Availability:** - Compare user's quantity vs product 'quantity' (Stock).
     - If user asks for MORE than stock, apologize and state the available limit.
  3. **Calculate Total:** - If stock is sufficient, Calculate: (User Quantity * Product Price).
  4. **Draft Response (Arabic):**
     - State the quantity requested.
     - State the total price clearly (S.R).
     - Ask for final confirmation to proceed with the invoice/shipping.
     - Example format: "تمام، طلبك هو 5 لفات. السعر الإجمالي بيكون 500 ريال. أعتمد الطلب؟"

  Constraint: Be concise.

  **Construct the Reply (Strict Formatting Rules):**
   - **NO Emojis:** Do not use any emojis (e.g., 🛑, ✅, 🙏).
   - **NO Markdown/Formatting:** Do not use asterisks (*), underscores (_), bold, or italics. Do not use quotation marks around the message.
    `;
        const aiMsg = await geminiModel.SendMessage({
            prompt: prompt,
            history: preChat,
            apiKey,
        });
        return {
            msg: aiMsg,
            product: product,
            prompt,
        };
    }
    // ============================================================
    // 4. دالة تأكيد الطلب (Order Confirmation)
    // ============================================================
    static async OrderConfirmation(userMsg, preChat, product, apiKey, customerPhone) {
        console.log("Processing Order Confirmation");
        const productDataString = JSON.stringify(product, null, 2);
        const prompt = `
    You are a Sales Agent. The user is replying to your order summary (Confirmation Stage).
    **Context: You are communicating via WhatsApp.**

    **Customer Phone:** ${customerPhone}  <-- Phone Number injected here
    **Product Data:**
    ${productDataString}

    **Goal:** Analyze the user's reply and generate a JSON response.

    User's Reply: "${userMsg}"

    **Instructions:**
    1. Analyze Sentiment (Confirm vs Cancel).
    2. Output ONLY Valid JSON with these keys:
       {
         "status": "CONFIRMED" or "CANCELLED",
         "useraimsg": "String (Saudi Dialect for customer)",
         "workeraimsg": "String (Report for worker including Phone Number & Product Details)"
       }

    3. **Content Logic:**
      **Construct the Reply (Strict Formatting Rules):**
       - **NO Emojis:** Do not use any emojis (e.g., 🛑, ✅, 🙏).
       - **NO Markdown/Formatting:** Do not use asterisks (*), underscores (_), bold, or italics. Do not use quotation marks around the message.
       - **If CONFIRMED:**
         - useraimsg: "تمام بإذن الله راح نوصلها لك في أقرب وقت، شكراً لثقتك "
         - workeraimsg: " *طلب جديد مؤكد* \n\nالعميل وافق على الطلب.\n📱 *رقم العميل:* ${customerPhone}\n\n*تفاصيل المنتج:*\n(Extract key details from the Product JSON above)."

       - **If CANCELLED:**
         - useraimsg: "تمام، حصل خير. تامرنا على شيء ثاني؟"
         - workeraimsg: null (No worker message needed)

    **Constraint:** Return ONLY raw JSON. No markdown formatting.
    
    `;
        let aiRawMsg = await geminiModel.SendMessage({
            prompt: prompt,
            history: preChat,
            apiKey,
        });
        aiRawMsg = aiRawMsg.replace(/```json|```/g, "").trim();
        let parsedResponse;
        parsedResponse = JSON.parse(aiRawMsg);
        return {
            status: parsedResponse.status,
            msg: parsedResponse.useraimsg,
            workeraimsg: parsedResponse.workeraimsg, // الان الرسالة تحتوي على رقم الجوال جاهزة
            product: product,
            prompt,
        };
    }
    static async TransferToWorker(userMsg, preChat, product, clientPhoneNumber, // <--- رقم العميل هنا
    apiKey) {
        console.log("Escalating to Worker...");
        const prompt = `
    You are a Customer Support Supervisor.
    **Context:** The AI bot failed to assist the client, or the client requested a human.
    **Goal:** Generate a JSON response to handle this handover smoothly.

    **Client Info:**
    - Message: "${userMsg}"
    - Phone: "${clientPhoneNumber}"

    **Instructions:**
    1. **useraimsg:** Write a polite, apologetic message in **Saudi Dialect** telling the user that a colleague will contact them shortly on their number (${clientPhoneNumber}).
    2. **workeraimsg:** Write a clear alert message for the Staff/Worker summarizing what the client wants and stating "Please contact this client immediately".

    **Construct the Reply (Strict Formatting Rules):**
     - **NO Emojis:** Do not use any emojis (e.g., 🛑, ✅, 🙏).
     - **NO Markdown/Formatting:** Do not use asterisks (*), underscores (_), bold, or italics. Do not use quotation marks around the message.

    **Output Format (Valid JSON ONLY):**
    {
      "status": "ESCALATED",
      "useraimsg": "String (Saudi Arabic message to client)",
      "workeraimsg": "String (Alert details for the worker)"
    }
    `;
        let aiRawMsg = await geminiModel.SendMessage({
            prompt: prompt,
            history: preChat,
            apiKey,
        });
        aiRawMsg = aiRawMsg.replace(/```json|```/g, "").trim();
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(aiRawMsg);
        }
        catch (e) {
            console.error("Failed to parse AI response in TransferToWorker", aiRawMsg);
            // Fallback في حال فشل الذكاء الاصطناعي في صياغة الـ JSON
            parsedResponse = {
                status: "ESCALATED",
                useraimsg: `ولا يهمك، تم استلام طلبك وراح يتواصل معك أحد الموظفين قريباً على الرقم ${clientPhoneNumber}.`,
                workeraimsg: `⚠️ تنبيه: العميل يطلب التحدث مع موظف. \nالرسالة: ${userMsg}\nالرقم: ${clientPhoneNumber}`,
            };
        }
        return {
            status: parsedResponse.status, // حالة الطلب (ESCALATED)
            msg: parsedResponse.useraimsg, // رسالة العميل (راح يتواصل معاك الموظف...)
            workeraimsg: parsedResponse.workeraimsg, // رسالة الموظف (تنبيه للاتصال)
            product: product,
            prompt,
        };
    }
}
export default Classification;
/*
  تحدد انواع تصانيف أسأال الزبائن
  -- qustion about previos product
  1. أسئلة عن المنتج
    - هل المنتج متوفر
    - كم سعر المنتج
    - كم مساحة المنتج او كم طول و عرض المنتج
  --> راح يبحث في المنتج اللي اترسل قبل كده
  --
  qustion about new product
  1. أستعلام عن منتج جديد
  2. استعلام عن منتج مشابه
  --> راح سشغل فنكشن البحث عن منتج
 -- global qustions
 2. أسئلة عن الشحن
   - هل توصلون المنتج
   - كم تكلفة الشحن
   - كم وقت الشحن
  --> راح ياخذ بيانات عن وكالة الشحن و يجاوب العميل على قد سؤاله
*/
//# sourceMappingURL=classAlgo.js.map