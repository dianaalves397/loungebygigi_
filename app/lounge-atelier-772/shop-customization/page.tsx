import ShopCustomizationPanel from "@/components/ShopCustomizationPanel";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ShopCustomizationPage() {
  return <ShopCustomizationPanel />;
}
