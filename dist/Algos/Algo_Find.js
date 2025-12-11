import { mockProducts } from "../products/productsData.js";
// --- 1. بناء كلاس خوارزمية BM25 يدوياً ---
class BM25 {
    documents = [];
    docLengths = [];
    avgDocLength = 0;
    idfCache = {};
    corpusSize = 0;
    termDocFreq = {};
    // الثوابت القياسية لـ BM25
    k1 = 1.2;
    b = 0.75;
    constructor(docs) {
        this.corpusSize = docs.length;
        this.documents = docs.map((doc) => this.tokenize(doc));
        this.docLengths = Object.values(this.documents).map((doc) => Object.values(doc).reduce((a, b) => a + b, 0));
        this.avgDocLength =
            this.docLengths.reduce((a, b) => a + b, 0) / this.corpusSize;
        // حساب تكرار الكلمات في المستندات
        this.documents.forEach((doc) => {
            Object.keys(doc).forEach((term) => {
                this.termDocFreq[term] = (this.termDocFreq[term] || 0) + 1;
            });
        });
    }
    // دالة تقسيم النص إلى كلمات (Tokenization)
    tokenize(text) {
        const tokens = text
            .toLowerCase()
            .replace(/[^\w\s]/g, "") // إزالة الرموز
            .split(/\s+/)
            .filter((t) => t.length > 0);
        const freq = {};
        tokens.forEach((t) => (freq[t] = (freq[t] || 0) + 1));
        return freq;
    }
    // حساب Inverse Document Frequency
    getIDF(term) {
        if (this.idfCache[term])
            return this.idfCache[term];
        const n = this.termDocFreq[term] || 0;
        // معادلة IDF القياسية
        const idf = Math.log((this.corpusSize - n + 0.5) / (n + 0.5) + 1);
        this.idfCache[term] = idf;
        return idf;
    }
    // دالة البحث وحساب السكور
    search(query) {
        const queryTokens = Object.keys(this.tokenize(query));
        const scores = new Array(this.corpusSize).fill(0);
        queryTokens.forEach((term) => {
            const idf = this.getIDF(term);
            this.documents.forEach((doc, index) => {
                const tf = doc[term] || 0;
                if (tf > 0) {
                    const docLen = this.docLengths[index];
                    // معادلة BM25 الكاملة
                    const numerator = tf * (this.k1 + 1);
                    const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
                    scores[index] += idf * (numerator / denominator);
                }
            });
        });
        return scores;
    }
}
// --- 2. تجهيز البيانات ---
function prepareSearchContext(prod) {
    const attrString = Object.entries(prod.attributes)
        .map(([key, val]) => `${key} ${val}`)
        .join(" ");
    // ندمج الاسم والوصف ورقم القطعة لزيادة دقة البحث
    return `${prod.name} ${prod.sku} ${prod.description} ${attrString}`;
}
// تهيئة محرك البحث مرة واحدة عند تشغيل السيرفر
console.log("⚙️  جاري بناء فهرس BM25 اليدوي...");
const searchCorpus = mockProducts.map(prepareSearchContext);
const bm25Engine = new BM25(searchCorpus);
console.log("✅ تم الفهرسة! النظام جاهز (بدون مكتبات خارجية).");
export const sleep = (dlay) => {
    return new Promise((resolve) => setTimeout(resolve, dlay));
};
// --- 3. دالة البحث الرئيسية ---
export const SearchProductByUserMsg = async (userMsg) => {
    console.log(`\n🔍 Customer Ask About: "${userMsg}"`);
    // تنفيذ البحث
    const scores = bm25Engine.search(userMsg);
    // دمج النتائج مع المنتجات الأصلية وترتيبها
    const results = mockProducts
        .map((prod, index) => ({
        ...prod,
        score: scores[index],
    }))
        .filter((res) => res.score > 0) // استبعاد النتائج الصفرية
        .sort((a, b) => b.score - a.score); // ترتيب تنازلي حسب القوة
    if (results.length === 0) {
        console.log("   ⚠️ Product Not Found !!");
        return null;
    }
    const bestMatch = results[0];
    return bestMatch;
};
//# sourceMappingURL=Algo_Find.js.map