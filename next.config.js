/** @type {import("next").NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    // 30 dias de cache nas imagens otimizadas → egress mínimo
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "files.cdn.printful.com" },
      { protocol: "https", hostname: "cdn.printful.com" },
      { protocol: "https", hostname: "i.postimg.cc" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "static.wixstatic.com" },
      { protocol: "https", hostname: "*.supabase.co" }
    ]
  }
};

module.exports = nextConfig;
