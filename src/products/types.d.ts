// 1. تعريف أنواع الوحدات والحالات لضمان الدقة (Type Safety)
export type ProductStatus = "in_stock" | "out_of_stock" | "discontinued";
export type Currency = "SAR" | "USD" | "EUR"; // يمكن إضافة المزيد
export type WeightUnit = "kg" | "g" | "lb";
export type LengthUnit = "meter" | "cm" | "mm" | "inch";

// 2. واجهة التوفر (Availability)
export interface ProductAvailability {
  status: ProductStatus;
  quantity: number;
  warehouse_location?: string;
}

// 3. واجهة التسعير (Pricing)
export interface ProductPricing {
  currency: Currency;
  unit_price: number;
  bulk_price?: number;
  min_order_qty?: number;
}

// 4. واجهة المواصفات الفيزيائية (Physical Specs)
export interface PhysicalSpecs {
  weight: {
    value: number;
    unit: WeightUnit;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: LengthUnit;
  };
}

// 5. الواجهة الرئيسية للمنتج (Product)
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;

  availability: ProductAvailability;
  pricing: ProductPricing;
  physical_specs: PhysicalSpecs;

  attributes: Record<string, string | number | boolean>;

  /** معرفات لمنتجات بديلة */
  alternatives?: string[];
}
