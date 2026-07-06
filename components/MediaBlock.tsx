// @ts-nocheck

import Image from "next/image";

type Props = {
  type?: "image" | "video" | string;
  url?: string;
  src?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export default function MediaBlock({
  type = "image",
  url,
  src,
  alt = "",
  className = "",
  priority = false,
  sizes = "(max-width: 620px) 92vw, (max-width: 1024px) 70vw, 45vw"
}: Props) {
  const mediaUrl = url || src || "";

  if (!mediaUrl) return null;

  const isVideo =
    type === "video" ||
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(mediaUrl);

  if (isVideo) {
    return (
      <video
        className={className}
        src={mediaUrl}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
      />
    );
  }

  return (
    <Image
      className={className}
      src={mediaUrl}
      alt={alt}
      width={1200}
      height={1500}
      sizes={sizes}
      quality={72}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
    />
  );
}
