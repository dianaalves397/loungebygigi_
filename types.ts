export type ProductColor = {
  name: string;
  hex: string;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  category: string;
  categoryIds?: string[];
  collection: string;
  gender: "women" | "men" | "unisex";
  style: string;
  price: number;
  compareAt?: number;
  cost?: number;
  stock: number;
  source: "manual" | "shopify" | "supplier" | "printful" | "printify" | "apliiq";
  status: "active" | "draft" | "archived";
  image: string;
  mediaType: "image" | "video";
  gallery: string[];
  description: string;
  details: string[];
  colors: ProductColor[];
  sizes: string[];
  tags: string[];
  provider?: "manual" | "printful" | "printify" | "apliiq" | "shopify";
  providerProductId?: string;
  providerVariantId?: string;
  printfulSyncProductId?: string;
  printfulSyncVariantId?: string;
  printifyProductId?: string;
  printifyVariantId?: string;
  apliiqSku?: string;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  createdAt?: string;
};

export type Category = {
  id: string;
  name: string;
  parentId?: string; // subcategoria quando definido
  gender: "women" | "men" | "unisex";
  image: string;
  imageWomen?: string;
  imageMen?: string;
  mediaType: "image" | "video";
  featured: boolean;
  hidden?: boolean;
  showInMenTab?: boolean;
  showInWomenTab?: boolean;
  sortOrder?: number;
  introTitle?: string;
  introText?: string;
  styles: string[];
};

export type CartItem = {
  productId: string;
  title: string;
  image: string;
  category?: string;
  price: number;
  compareAt?: number;
  quantity: number;
  color?: string;
  size?: string;
  provider?: "manual" | "printful" | "printify" | "apliiq" | "shopify";
  providerProductId?: string;
  providerVariantId?: string;
  printfulSyncProductId?: string;
  printfulSyncVariantId?: string;
  printifyProductId?: string;
  printifyVariantId?: string;
  apliiqSku?: string;
  shopifyVariantId?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  customerEmail: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  paymentProvider: "stripe" | "paypal" | "shopify" | "woocommerce" | "manual";
  fulfillmentProvider?: "printful" | "printify" | "apliiq" | "manual";
  total: number;
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    price: number;
    variant?: string;
  }>;
  receiptSent: boolean;
};

export type Customer = {
  email: string;
  name: string;
  addresses: any[];
  createdAt: string;
};

