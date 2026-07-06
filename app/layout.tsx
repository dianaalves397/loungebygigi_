import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import "./editorial.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap"
});

const bodyFont = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
  display: "swap"
});
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL("https://loungebygigi.online"),
  title: {
    default: "Lounge by Gigi | Fashion, Swimwear & Elevated Essentials",
    template: "%s | Lounge by Gigi"
  },
  description:
    "Lounge by Gigi is an online fashion store for swimwear, essentials, resort wear and elevated everyday pieces.",
  keywords: [
    "Lounge by Gigi",
    "Lounge",
    "lounge by gigi store",
    "lounge fashion",
    "swimwear",
    "women fashion",
    "men fashion",
    "resort wear",
    "elevated essentials",
    "online clothing store"
  ],
  authors: [{ name: "Lounge by Gigi" }],
  creator: "Lounge by Gigi",
  publisher: "Lounge by Gigi",
  alternates: {
    canonical: "https://loungebygigi.online"
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://loungebygigi.online",
    siteName: "Lounge by Gigi",
    title: "Lounge by Gigi | Fashion, Swimwear & Elevated Essentials",
    description:
      "Discover Lounge by Gigi: swimwear, essentials, resort wear and elevated everyday pieces.",
    images: [
      {
        url: "https://i.postimg.cc/fbMj7BXh/IMG-0386.jpg",
        width: 1200,
        height: 630,
        alt: "Lounge by Gigi"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Lounge by Gigi | Fashion, Swimwear & Elevated Essentials",
    description:
      "Discover Lounge by Gigi: swimwear, essentials, resort wear and elevated everyday pieces.",
    images: ["https://i.postimg.cc/fbMj7BXh/IMG-0386.jpg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  icons: {
    icon: "/icon.svg"
  },
  manifest: "/manifest.json"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "Lounge by Gigi",
    alternateName: "Lounge",
    url: "https://loungebygigi.online",
    logo: "https://loungebygigi.online/icon.svg",
    image: "https://i.postimg.cc/fbMj7BXh/IMG-0386.jpg",
    description:
      "Lounge by Gigi is an online fashion store for swimwear, essentials, resort wear and elevated everyday pieces.",
    sameAs: [],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://loungebygigi.online/shop?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <link rel="preconnect" href="https://i.postimg.cc" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://files.cdn.printful.com" />
        <link rel="dns-prefetch" href="https://i.postimg.cc" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://files.cdn.printful.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}<SiteFooter />
      </body>
    </html>
  );
}




