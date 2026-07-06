import ContentPagesPanel from "@/components/ContentPagesPanel";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PagesControlPage() {
  return <ContentPagesPanel />;
}
