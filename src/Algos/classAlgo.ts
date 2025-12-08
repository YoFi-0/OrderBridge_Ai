import { getCompanyInfo } from "../company/companyData.js";
import { ioOnProductFound, ioSearch } from "../http/index.js";
import { geminiModel, type ChatMessage } from "../models/gemini.js";
import type { Product } from "../products/types.js";
import { SearchProductByUserMsg } from "./Algo_Find.js";

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
  | "order_confirmation";

class Classification {
  public static async Search(
    userMsg: string,
    preChat: ChatMessage[],
    apiKey: string,
  ): Promise<ClassificationData> {
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
    const data = JSON.parse(cleanedStr) as ClassificationData;
    return {
      category: data.category,
      note: data.note,
      userMsg: userMsg,
    };
  }
  public static async QustionAboutNewProduct(
    userMsg: string,
    preChat: ChatMessage[],
    socketId: string,
    apiKey: string,
  ) {
    let product: Product | null | undefined = null;

    ioSearch(socketId, userMsg);
    product = await ioOnProductFound(socketId);

    console.log("product", product?.name);
    const prompt = `
  You are a professional Supplier Agent representing a wholesale supplier.
  **Context: You are communicating via WhatsApp.**
  **Restriction: Use Saudi dialect only**
  **Constraint: Keep your response very short, concise, and direct.**

  I have located the following product based on the client's inquiry:
  ${JSON.stringify(product)}

  Your task is to reply to the client in Arabic with a professional, business-oriented tone:
  1. Confirm that you have located this specific product (Mention the Product Name clearly).
  2. Ask the client to confirm if this is the exact item they are looking to source or order ("هل هذا هو الصنف المطلوب؟").
  3. Invite the client to ask about specifications, quantities, availability, or any technical details.

  Avoid flowery sales language; be precise and direct.
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
  public static async QuestionAboutPreviousProduct(
    userMsg: string,
    preChat: ChatMessage[],
    product: Product,
    apiKey: string,
  ) {
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
  public static async GlobalQuestions(
    userMsg: string,
    preChat: ChatMessage[],
    product: Product, // يمكننا إبقاء المنتج في السياق لو سأل العميل "هل تشحنون هذا المنتج للرياض؟"
    apiKey: string,
  ) {
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
  public static async OrderQuestion(
    userMsg: string,
    preChat: ChatMessage[],
    product: Product,
    apiKey: string,
  ) {
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
  public static async OrderConfirmation(
    userMsg: string,
    preChat: ChatMessage[],
    product: Product,
    apiKey: string,
  ) {
    console.log("Processing Order Confirmation");

    // ملاحظة: نعتمد على الـ preChat ليعرف الذكاء الاصطناعي السعر والكمية التي تم ذكرها في الرسالة السابقة
    const prompt = `
  You are a Sales Agent. The user is replying to your order summary (Confirmation Stage).
  **Context: You are communicating via WhatsApp.**
  **Restriction: Use Saudi dialect only**
  **Constraint: Keep your response very short, concise, and direct.**
  
  User's Reply: "${userMsg}"

  Instructions:
  1. **Analyze Sentiment:** Is the user saying "Yes/Confirm" or "No/Cancel"?
  2. **If YES:** - Reply with a success message in Arabic.
     - Reply politely acknowledging the cancellation.
     - Say "تمام ب إذن الله راح نوصلها لك في اقرب وقت".
  3. **If NO:**
     - Reply politely acknowledging the Confirmation.
     - Say "تمام تحتاج شي ثاني؟".

  Constraint: Very short and professional Arabic response.
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
