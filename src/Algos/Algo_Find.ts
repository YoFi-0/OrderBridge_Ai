import { mockProducts } from "../products/productsData.js";
import type { Product } from "../products/types.d.js";

// --- 1. بناء كلاس خوارزمية BM25 يدوياً ---
class BM25 {
  private documents: { [key: string]: number }[] = [];
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private idfCache: { [key: string]: number } = {};
  private corpusSize: number = 0;
  private termDocFreq: { [key: string]: number } = {};

  // الثوابت القياسية لـ BM25
  private k1 = 1.2;
  private b = 0.75;

  constructor(docs: string[]) {
    this.corpusSize = docs.length;
    this.documents = docs.map((doc) => this.tokenize(doc));
    this.docLengths = Object.values(this.documents).map((doc) =>
      Object.values(doc).reduce((a, b) => a + b, 0),
    );
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
  private tokenize(text: string): { [key: string]: number } {
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // إزالة الرموز
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const freq: { [key: string]: number } = {};
    tokens.forEach((t) => (freq[t] = (freq[t] || 0) + 1));
    return freq;
  }

  // حساب Inverse Document Frequency
  private getIDF(term: string): number {
    if (this.idfCache[term]) return this.idfCache[term];
    const n = this.termDocFreq[term] || 0;
    // معادلة IDF القياسية
    const idf = Math.log((this.corpusSize - n + 0.5) / (n + 0.5) + 1);
    this.idfCache[term] = idf;
    return idf;
  }

  // دالة البحث وحساب السكور
  public search(query: string) {
    const queryTokens = Object.keys(this.tokenize(query));
    const scores = new Array(this.corpusSize).fill(0);

    queryTokens.forEach((term) => {
      const idf = this.getIDF(term);
      this.documents.forEach((doc, index) => {
        const tf = doc[term] || 0;
        if (tf > 0) {
          const docLen = this.docLengths[index]!;
          // معادلة BM25 الكاملة
          const numerator = tf * (this.k1 + 1);
          const denominator =
            tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
          scores[index] += idf * (numerator / denominator);
        }
      });
    });

    return scores;
  }
}

// --- 2. تجهيز البيانات ---
function prepareSearchContext(prod: Product): string {
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

// --- 3. دالة البحث الرئيسية ---
export const SearchProductByUserMsg = async (
  userMsg: string,
): Promise<Product | null | undefined> => {
  console.log(`\n🔍 Customer Ask About: "${userMsg}"`);

  // تنفيذ البحث
  const scores = bm25Engine.search(userMsg);

  // دمج النتائج مع المنتجات الأصلية وترتيبها
  const results = mockProducts
    .map((prod, index) => ({
      ...prod,
      score: scores[index]!,
    }))
    .filter((res) => res.score > 0) // استبعاد النتائج الصفرية
    .sort((a, b) => b.score - a.score); // ترتيب تنازلي حسب القوة

  if (results.length === 0) {
    console.log("   ⚠️ Product Not Found !!");
    return null;
  }

  const bestMatch = results[0];

  return bestMatch as Product;
};
