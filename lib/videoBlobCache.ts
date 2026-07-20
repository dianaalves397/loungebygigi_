"use client";

// Cache dos vídeos de abertura das categorias (scroll-scrubbed) no Cache
// Storage do browser — persiste entre visitas (e entre sessões), não só
// durante a página atual. Assim, quem já entrou antes numa categoria nunca
// volta a pedir o vídeo ao servidor: fica servido do disco do próprio
// dispositivo, sem gastar largura de banda extra.
const CACHE_NAME = "lounge-scroll-videos-v1";

async function fetchAndCache(src: string, cache: Cache | null): Promise<Blob> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Falha ao pedir vídeo: ${src}`);
  if (cache) {
    try {
      await cache.put(src, response.clone());
    } catch {
      // se falhar a gravar em cache, continua na mesma — não é crítico
    }
  }
  return response.blob();
}

export async function getVideoBlobUrl(src: string): Promise<string> {
  let blob: Blob;

  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(src);
      blob = cached ? await cached.blob() : await fetchAndCache(src, cache);
    } catch {
      blob = await fetchAndCache(src, null);
    }
  } else {
    blob = await fetchAndCache(src, null);
  }

  return URL.createObjectURL(blob);
}
