"use client";

// LOUNGE — a revista viva, reconstruída como material de imprensa real.
// Nada de objetos low-poly: o mundo é feito de PAPEL IMPRESSO — uma capa
// gigante, um spread aberto com tipografia verdadeira, uma parede de colagem
// com fragmentos rasgados em camadas separadas (paralaxe real entre elas,
// fita-cola, molas) e um tríptico de arquivo. Tudo composto em canvas a
// partir das fotografias da edição, com grão de papel, sombras reais e
// vinhetas — para parecer impressão, não um jogo.
//
// Percurso da câmara (scroll):
//   capa → contorna a capa → spread aberto → parede de colagem → tríptico
//   do arquivo → dissolução

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { EDITIONS, type EditionConfig } from "@/components/category/editions";

// ---------------- utilitários de composição ----------------

function cssFont(varName: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

// grão de papel + vinheta suave nas margens — o segredo do ar "impresso"
function paperFinish(ctx: CanvasRenderingContext2D, w: number, h: number, grain = 900) {
  for (let i = 0; i < grain; i++) {
    ctx.fillStyle = `rgba(${40 + Math.random() * 60},${34 + Math.random() * 50},${26 + Math.random() * 40},${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(30,22,14,0.16)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

// fotografia com grade editorial (sépia unificada)
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  crop?: [number, number, number, number] // fração: sx, sy, sw, sh
) {
  const [fx, fy, fw, fh] = crop || [0, 0, 1, 1];
  ctx.drawImage(
    image,
    image.width * fx, image.height * fy, image.width * fw, image.height * fh,
    x, y, w, h
  );
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(196,172,138,0.24)";
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(242,236,221,0.06)";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// fita-cola translúcida
function drawTape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(235,226,204,0.72)";
  ctx.fillRect(-w / 2, -13, w, 26);
  ctx.fillStyle = "rgba(255,252,242,0.25)";
  ctx.fillRect(-w / 2, -13, w, 8);
  ctx.restore();
}

// rasga uma ou duas bordas do canvas
function tearEdges(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, edges: Array<"top" | "bottom" | "left" | "right">) {
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  ctx.globalCompositeOperation = "destination-out";
  for (const edge of edges) {
    ctx.beginPath();
    if (edge === "bottom" || edge === "top") {
      const edgeY = edge === "bottom" ? h : 0;
      const direction = edge === "bottom" ? -1 : 1;
      ctx.moveTo(0, edgeY);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, edgeY + direction * (4 + random() * 18));
      ctx.lineTo(w, edgeY);
    } else {
      const edgeX = edge === "right" ? w : 0;
      const direction = edge === "right" ? -1 : 1;
      ctx.moveTo(edgeX, 0);
      for (let y = 0; y <= h; y += 12) ctx.lineTo(edgeX + direction * (4 + random() * 16), y);
      ctx.lineTo(edgeX, h);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// ---------------- percurso da câmara ----------------

const DEFAULT_PATH: Array<{ pos: [number, number, number]; look: [number, number, number] }> = [
  { pos: [0, 1.5, 9.5], look: [-0.9, 1.9, 0] },      // capa
  { pos: [2.2, 1.5, 2.8], look: [0, 1.7, -5.2] },    // contornar a capa
  { pos: [0.2, 1.5, -1.6], look: [0, 1.7, -5.4] },   // spread
  { pos: [-0.5, 1.6, -5.8], look: [0.2, 1.8, -10.6] }, // colagem
  { pos: [0.2, 1.6, -10.8], look: [0, 1.9, -16.2] }, // tríptico
  { pos: [0, 3.6, -13.5], look: [0, 3.4, -25] }      // dissolução
];

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

type ShopItem = { title: string; price?: string | number; image?: string };

export default function MagazineWorld({
  progressRef,
  edition = "woman",
  shopItems = []
}: {
  progressRef: MutableRefObject<number>;
  edition?: "woman" | "man" | "summer" | "summerMan";
  shopItems?: ShopItem[];
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const config: EditionConfig = EDITIONS[edition];
    const PATH = (config.path || DEFAULT_PATH).map((point) => ({
      pos: new THREE.Vector3(...point.pos),
      look: new THREE.Vector3(...point.look)
    }));
    const isRiviera = config.environment === "riviera";
    const isZoom = config.pathStyle === "zoomIn";

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const isMobile = width < 720;

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(isRiviera ? 0xd6ddd0 : 0x121a12, isRiviera ? 14 : 10, isRiviera ? 52 : 42);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 120);
    camera.position.copy(PATH[0].pos);

    const hemisphere = new THREE.HemisphereLight(0xffe9c8, isRiviera ? 0x9aa694 : 0x141c12, isRiviera ? 0.95 : 0.7);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffd9a4, 2);
    sun.position.set(-6, 10, 5);
    if (!isMobile) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -16;
      sun.shadow.camera.right = 16;
      sun.shadow.camera.top = 14;
      sun.shadow.camera.bottom = -6;
      sun.shadow.camera.far = 60;
      sun.shadow.bias = -0.0004;
    }
    scene.add(sun);
    const warm = new THREE.PointLight(0xffd9a0, 22, 32, 2);
    warm.position.set(3, 3, 4);
    scene.add(warm);
    const gallery = new THREE.PointLight(0xffe6c0, 0, 24, 2);
    gallery.position.set(0, 4.5, -9.5);
    scene.add(gallery);

    const disposables: Array<{ dispose: () => void }> = [];
    function keep<T extends { dispose: () => void }>(item: T): T {
      disposables.push(item);
      return item;
    }
    let net: THREE.Mesh | null = null;

    // ---------------- riviera: areia de papel, mar ao fundo, sol alto ----------------
    if (isRiviera) {
      // areia clara com arcos de maré e grão
      const sand = document.createElement("canvas");
      sand.width = sand.height = 1024;
      {
        const ctx = sand.getContext("2d")!;
        ctx.fillStyle = "#e7dfcb";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.strokeStyle = "rgba(176,164,138,0.35)";
        for (let i = 0; i < 14; i++) {
          ctx.lineWidth = 2 + Math.random() * 3;
          ctx.beginPath();
          const y = 80 + i * 70 + Math.random() * 30;
          ctx.moveTo(-40, y);
          ctx.bezierCurveTo(300, y + 40 + Math.random() * 40, 700, y - 40 - Math.random() * 40, 1080, y + 20);
          ctx.stroke();
        }
        if (isZoom) {
          // sombra de palmeira a atravessar a areia (Slim Aarons de papel)
          ctx.save();
          ctx.translate(760, 240);
          ctx.rotate(0.5);
          ctx.fillStyle = "rgba(64,78,64,0.2)";
          for (let frond = 0; frond < 9; frond++) {
            ctx.save();
            ctx.rotate((frond / 9) * Math.PI * 1.3 - 0.6);
            ctx.beginPath();
            ctx.ellipse(150, 0, 170, 17 + Math.random() * 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
        paperFinish(ctx, 1024, 1024, 5200);
      }
      const ground = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(52, 80)),
        keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(sand)), roughness: 0.98 }))
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, -2, -18);
      ground.receiveShadow = true;
      scene.add(ground);

      // faixa de mar no horizonte
      const sea = document.createElement("canvas");
      sea.width = 512; sea.height = 128;
      {
        const ctx = sea.getContext("2d")!;
        const grad = ctx.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0, "#b7cdc8");
        grad.addColorStop(0.55, "#8aacaa");
        grad.addColorStop(1, "#6f9394");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = "rgba(245,242,230,0.4)";
        for (let i = 0; i < 40; i++) {
          ctx.lineWidth = 1 + Math.random();
          const y = 30 + Math.random() * 90;
          const x = Math.random() * 512;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 14 + Math.random() * 30, y);
          ctx.stroke();
        }
      }
      const horizon = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(110, 12)),
        keep(new THREE.MeshBasicMaterial({ map: keep(toTexture(sea)) }))
      );
      horizon.position.set(0, 3.2, -40);
      scene.add(horizon);

      if (isZoom) {
        // ---- toalha de praia às riscas, com ondulação de tecido ----
        const towelCanvas = document.createElement("canvas");
        towelCanvas.width = towelCanvas.height = 512;
        {
          const ctx = towelCanvas.getContext("2d")!;
          ctx.fillStyle = "#efe7d2";
          ctx.fillRect(0, 0, 512, 512);
          ctx.fillStyle = "#7f9a9a";
          for (let x = 26; x < 512; x += 96) ctx.fillRect(x, 0, 34, 512);
          ctx.fillStyle = "rgba(122,90,70,0.16)";
          for (let i = 0; i < 900; i++) ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.4, 1.4);
        }
        const towel = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(3.4, 4.8, 26, 26)),
          keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(towelCanvas)), roughness: 0.95 }))
        );
        {
          const attr = towel.geometry.getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i < attr.count; i++) {
            attr.setZ(i, Math.sin(attr.getX(i) * 2.4) * 0.02 + Math.cos(attr.getY(i) * 1.8) * 0.02);
          }
          towel.geometry.computeVertexNormals();
        }
        towel.rotation.x = -Math.PI / 2;
        towel.position.set(0.45, -1.965, 1.05);
        towel.receiveShadow = true;
        scene.add(towel);

        // ---- páginas gigantes: o interior da revista vira o chão do mundo ----
        const pagesCanvas = document.createElement("canvas");
        pagesCanvas.width = 1024; pagesCanvas.height = 1024;
        {
          const ctx = pagesCanvas.getContext("2d")!;
          ctx.fillStyle = "#f1ead8";
          ctx.fillRect(0, 0, 1024, 1024);
          // goteira central
          const gutter = ctx.createLinearGradient(482, 0, 542, 0);
          gutter.addColorStop(0, "rgba(0,0,0,0)");
          gutter.addColorStop(0.5, "rgba(60,50,38,0.22)");
          gutter.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gutter;
          ctx.fillRect(482, 0, 60, 1024);
          // colunas de texto impressas, muito ténues
          ctx.fillStyle = "rgba(70,60,46,0.16)";
          for (const px of [70, 250, 590, 770]) {
            let y = 90;
            let seed = px;
            const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
            while (y < 950) {
              ctx.fillRect(px, y, 150 * (0.6 + random() * 0.4), 4);
              y += 16;
              if (random() > 0.88) y += 14;
            }
          }
          paperFinish(ctx, 1024, 1024, 1600);
        }
        const bigPages = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(17, 26)),
          keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(pagesCanvas)), roughness: 0.94 }))
        );
        bigPages.rotation.x = -Math.PI / 2;
        bigPages.position.set(0, -1.93, -13);
        bigPages.receiveShadow = true;
        scene.add(bigPages);
      }
    }

    if (!isRiviera) {
    // ---------------- chão: court ao lusco-fusco, com grade rica ----------------
      {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1024;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#6d4436";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.fillStyle = "#48594a";
        ctx.fillRect(112, 0, 800, 1024);
        // desgaste do piso
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = `rgba(${30 + Math.random() * 30},${40 + Math.random() * 24},${30 + Math.random() * 20},0.16)`;
          ctx.beginPath();
          ctx.ellipse(Math.random() * 1024, Math.random() * 1024, 40 + Math.random() * 140, 20 + Math.random() * 70, Math.random() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(238,233,220,0.55)";
        ctx.lineWidth = 6;
        ctx.strokeRect(152, 60, 720, 904);
        ctx.beginPath();
        ctx.moveTo(512, 60); ctx.lineTo(512, 964);
        ctx.moveTo(152, 512); ctx.lineTo(872, 512);
        ctx.stroke();
        paperFinish(ctx, 1024, 1024, 5000);

        const ground = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(48, 76)),
          keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(canvas)), roughness: 0.96 }))
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -2, -16);
        ground.receiveShadow = true;
        scene.add(ground);
      }

      // ---------------- fundos: sebes escuras + rede como cenografia ----------------
      {
        const canvas = document.createElement("canvas");
        canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#0f1810";
        ctx.fillRect(0, 0, 512, 256);
        for (let i = 0; i < 2600; i++) {
          ctx.fillStyle = `rgba(${12 + Math.random() * 22},${24 + Math.random() * 30},${12 + Math.random() * 18},${0.12 + Math.random() * 0.2})`;
          ctx.beginPath();
          ctx.arc(Math.random() * 512, Math.random() * 256, 2 + Math.random() * 7, 0, Math.PI * 2);
          ctx.fill();
        }
        const hedgeMaterial = keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(canvas)), roughness: 1 }));
        for (const [x, z, rotY, w] of [
          [0, -34, 0, 84], [-20, -14, Math.PI / 2, 48], [20, -14, -Math.PI / 2, 48]
        ] as Array<[number, number, number, number]>) {
          const hedge = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, 16)), hedgeMaterial);
          hedge.position.set(x, 4, z);
          hedge.rotation.y = rotY;
          scene.add(hedge);
        }
      }

      {
        // rede fina ao fundo (só no court) (contexto, sem parecer brinquedo)
        const canvas = document.createElement("canvas");
        canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, 512, 256);
        ctx.strokeStyle = "rgba(18,16,14,0.9)";
        ctx.lineWidth = 1.6;
        for (let x = -256; x < 768; x += 14) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 256, 256); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + 256, 0); ctx.lineTo(x, 256); ctx.stroke();
        }
        ctx.fillStyle = "rgba(238,233,222,0.95)";
        ctx.fillRect(0, 0, 512, 18);
        const texture = keep(toTexture(canvas));
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.set(4, 1);

        net = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(26, 1.8, 80, 8)),
          keep(new THREE.MeshStandardMaterial({
            map: texture, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9
          }))
        );
        net.position.set(0, -0.9, -19.5);
        scene.add(net);
        const postMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x1b1c18, roughness: 0.5, metalness: 0.4 }));
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 10)), postMaterial);
          post.position.set(side * 13, -1, -19.5);
          scene.add(post);
        }
      }
    }

    // bokeh quente
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 128;
    {
      const ctx = glowCanvas.getContext("2d")!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const glow = keep(new THREE.CanvasTexture(glowCanvas));
    const bokeh: THREE.Sprite[] = [];
    ([
      [-8, 4.4, -26, 5, 0.18], [5, 5.6, -24, 3.6, 0.15], [11, 3.2, -28, 5.2, 0.13],
      [-5, 5, -12, 3, 0.1], [7, 4.6, -16, 3.2, 0.1]
    ] as Array<[number, number, number, number, number]>).forEach(([x, y, z, size, opacity]) => {
      const sprite = new THREE.Sprite(
        keep(new THREE.SpriteMaterial({
          map: glow, color: 0xffdca8, transparent: true, opacity,
          blending: THREE.AdditiveBlending, depthWrite: false
        }))
      );
      sprite.position.set(x, y, z);
      sprite.scale.setScalar(size);
      scene.add(sprite);
      bokeh.push(sprite);
    });

    // ---------------- material de imprensa (assíncrono) ----------------

    const swayers: Array<{ mesh: THREE.Object3D; amp: number; speed: number; phase: number }> = [];
    let coverDoor: THREE.Group | null = null; // capa (modo zoomIn: deitada na revista)
    const wireMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 0.6 }));

    function hangWire(group: THREE.Group, x: number, topLocalY: number, ceiling = 7.5) {
      const worldY = group.position.y + topLocalY;
      const wireHeight = Math.max(ceiling - worldY, 0.5);
      const wire = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.007, 0.007, wireHeight, 6)), wireMaterial);
      wire.position.set(x, topLocalY + wireHeight / 2, 0);
      group.add(wire);
      // mola
      const clip = new THREE.Mesh(keep(new THREE.BoxGeometry(0.05, 0.09, 0.02)), keep(new THREE.MeshStandardMaterial({ color: 0x8a7355, roughness: 0.5, metalness: 0.3 })));
      clip.position.set(x, topLocalY + 0.02, 0.012);
      group.add(clip);
    }

    function addPanel(
      canvas: HTMLCanvasElement,
      worldW: number,
      position: [number, number, number],
      rotationY: number,
      options: { tilt?: number; hang?: boolean; curve?: number; sway?: number } = {}
    ) {
      const worldH = worldW * (canvas.height / canvas.width);
      const group = new THREE.Group();
      const panel = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(worldW, worldH, options.curve ? 24 : 1, 1)),
        keep(new THREE.MeshStandardMaterial({
          map: keep(toTexture(canvas)),
          transparent: true,
          alphaTest: 0.15,
          side: THREE.DoubleSide,
          roughness: 0.88
        }))
      );
      if (options.curve) {
        const attr = panel.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < attr.count; i++) {
          const px = attr.getX(i);
          attr.setZ(i, Math.sin((px / worldW) * Math.PI) * options.curve);
        }
        panel.geometry.computeVertexNormals();
      }
      panel.castShadow = !isMobile;
      group.add(panel);
      if (options.hang && !isZoom) {
        hangWire(group, -worldW * 0.3, worldH / 2);
        hangWire(group, worldW * 0.3, worldH / 2);
      }
      group.position.set(...position);
      if (isZoom) {
        // no mundo pop-up tudo assenta nas páginas gigantes
        group.position.y = -1.92 + worldH / 2;
        const tab = new THREE.Mesh(
          keep(new THREE.BoxGeometry(worldW * 0.32, 0.02, worldH * 0.2)),
          keep(new THREE.MeshStandardMaterial({ color: 0xe4dcc6, roughness: 0.9 }))
        );
        tab.position.set(0, -worldH / 2 + worldH * 0.08, -0.1);
        tab.rotation.x = 1;
        group.add(tab);
      }
      group.rotation.y = rotationY;
      group.rotation.z = options.tilt || 0;
      scene.add(group);
      if (options.sway) {
        swayers.push({ mesh: group, amp: options.sway, speed: 0.3 + Math.random() * 0.25, phase: Math.random() * 6 });
      }
      return group;
    }

    let alive = true;

    const sources = config.sources;
    Promise.allSettled(
      sources.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = src;
          })
      )
    )
      .then(async (results) => {
        if (!alive) return;
        const images = results.map((result) =>
          result.status === "fulfilled" ? result.value : null
        ) as Array<HTMLImageElement | null>;
        if (config.essential.some((index) => !images[index])) return; // base em falta
        try { await (document as any).fonts?.ready; } catch { /* segue */ }
        if (!alive) return;

        const bodyFont = cssFont("--lg-body", "Helvetica, Arial, sans-serif");
        const displayFont = cssFont("--lg-display", "Georgia, serif");

        function spacedCaps(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, spacing: number, color: string, weight = 300) {
          ctx.fillStyle = color;
          ctx.font = `${weight} ${size}px ${bodyFont}`;
          let cursor = x;
          for (const letter of text.toUpperCase()) {
            ctx.fillText(letter, cursor, y);
            cursor += ctx.measureText(letter).width + spacing;
          }
          return cursor - spacing;
        }

        // ---------- 1 · A CAPA ----------
        {
          const canvas = document.createElement("canvas");
          canvas.width = 768; canvas.height = 1024;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#efe8d6";
          ctx.fillRect(0, 0, 768, 1024);
          // fotografia full-bleed com margem de papel
          drawPhoto(ctx, images[config.cover.photo]!, 26, 26, 716, 972);
          // masthead sobre a fotografia
          ctx.textBaseline = "alphabetic";
          spacedCaps(ctx, "Lounge", 84, 168, 118, 26, "rgba(244,240,230,0.97)", 300);
          spacedCaps(ctx, config.cover.kicker, 96, 224, 21, 9, "rgba(244,240,230,0.92)");
          ctx.font = `italic 400 44px ${displayFont}`;
          ctx.fillStyle = "rgba(244,240,230,0.95)";
          ctx.fillText(config.cover.italic, 96, 940);
          spacedCaps(ctx, config.cover.footer, 96, 984, 15, 7, "rgba(244,240,230,0.8)");
          paperFinish(ctx, 768, 1024, 1300);

          if (isZoom) {
            // ---- a revista fechada, pousada na toalha ----
            const magW = 2.2;
            const magH = magW * (canvas.height / canvas.width);
            const magT = 0.09;
            const magX = 0.45, magZ = 1.05;
            const topY = -1.96 + magT;

            // pilha de páginas (o corpo da revista)
            const stack = new THREE.Mesh(
              keep(new THREE.BoxGeometry(magW, magT, magH)),
              keep(new THREE.MeshStandardMaterial({ color: 0xf4efdf, roughness: 0.85 }))
            );
            stack.position.set(magX, -1.96 + magT / 2, magZ);
            stack.castShadow = !isMobile;
            stack.receiveShadow = true;
            scene.add(stack);

            // primeira página, revelada quando a capa levanta
            const innerCanvas = document.createElement("canvas");
            innerCanvas.width = 512; innerCanvas.height = Math.round(512 * (magH / magW));
            {
              const ictx = innerCanvas.getContext("2d")!;
              ictx.fillStyle = "#f1ead8";
              ictx.fillRect(0, 0, innerCanvas.width, innerCanvas.height);
              ictx.textBaseline = "alphabetic";
              ictx.font = `italic 400 44px ${displayFont}`;
              ictx.fillStyle = "rgba(40,32,24,0.9)";
              ictx.fillText("vira a página…", 54, 130);
              ictx.fillStyle = "rgba(46,38,28,0.6)";
              ictx.fillRect(54, 156, 150, 2);
              paperFinish(ictx, innerCanvas.width, innerCanvas.height, 500);
            }
            const innerPage = new THREE.Mesh(
              keep(new THREE.PlaneGeometry(magW - 0.05, magH - 0.05)),
              keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(innerCanvas)), roughness: 0.9 }))
            );
            innerPage.rotation.x = -Math.PI / 2;
            innerPage.position.set(magX, topY + 0.004, magZ);
            scene.add(innerPage);

            // a capa: deitada por cima, dobradiça na lombada esquerda; levanta com o scroll
            coverDoor = new THREE.Group();
            const leaf = new THREE.Mesh(
              keep(new THREE.PlaneGeometry(magW, magH)),
              keep(new THREE.MeshStandardMaterial({
                map: keep(toTexture(canvas)),
                side: THREE.DoubleSide,
                roughness: 0.86
              }))
            );
            leaf.rotation.x = -Math.PI / 2; // deitada, a olhar para cima
            leaf.position.x = magW / 2;
            leaf.castShadow = !isMobile;
            coverDoor.add(leaf);
            coverDoor.position.set(magX - magW / 2, topY + 0.012, magZ);
            scene.add(coverDoor);
          } else {
            const cover = addPanel(canvas, 4.4, [-0.9, 1.4, 0], 0.06, { curve: 0.12, sway: 0.008 });
            cover.children[0].receiveShadow = true;
          }
        }

        // ---------- 2 · O SPREAD ABERTO ----------
        {
          // página esquerda: fotografia
          const left = document.createElement("canvas");
          left.width = 640; left.height = 860;
          {
            const ctx = left.getContext("2d")!;
            ctx.fillStyle = "#f0e9d8";
            ctx.fillRect(0, 0, 640, 860);
            drawPhoto(ctx, images[config.spread.photo]!, 44, 44, 552, 700);
            spacedCaps(ctx, config.spread.photoCaption, 44, 796, 16, 7, "rgba(46,38,28,0.8)");
            ctx.font = `300 15px ${bodyFont}`;
            ctx.fillStyle = "rgba(46,38,28,0.55)";
            ctx.fillText("Lounge — Édition Sports", 44, 828);
            ctx.textAlign = "right";
            ctx.fillText("12", 596, 828);
            ctx.textAlign = "left";
            paperFinish(ctx, 640, 860, 900);
          }

          // página direita: tipografia editorial (título itálico + colunas)
          const right = document.createElement("canvas");
          right.width = 640; right.height = 860;
          {
            const ctx = right.getContext("2d")!;
            ctx.fillStyle = "#f0e9d8";
            ctx.fillRect(0, 0, 640, 860);
            ctx.font = `italic 400 58px ${displayFont}`;
            ctx.fillStyle = "rgba(40,32,24,0.94)";
            ctx.fillText(config.spread.headline[0], 52, 130);
            ctx.fillText(config.spread.headline[1], 52, 196);
            ctx.fillStyle = "rgba(46,38,28,0.7)";
            ctx.fillRect(52, 232, 180, 2);

            // texto verdadeiro, em duas colunas
            function paragraph(text: string, x: number, startY: number, maxWidth: number) {
              ctx.font = `300 15px ${bodyFont}`;
              ctx.fillStyle = "rgba(52,44,34,0.82)";
              const words = text.split(" ");
              let line = "";
              let y = startY;
              for (const word of words) {
                const attempt = line ? `${line} ${word}` : word;
                if (ctx.measureText(attempt).width > maxWidth && line) {
                  ctx.fillText(line, x, y);
                  line = word;
                  y += 22;
                } else {
                  line = attempt;
                }
              }
              if (line) ctx.fillText(line, x, y);
              return y + 22;
            }

            let columnY = 296;
            for (const text of config.spread.col1) {
              columnY = paragraph(text, 52, columnY, 236) + 12;
            }
            columnY = 296;
            for (const text of config.spread.col2) {
              columnY = paragraph(text, 352, columnY, 236) + 12;
            }
            // fotografia pequena com legenda
            if (images[config.spread.inset.photo]) {
              drawPhoto(ctx, images[config.spread.inset.photo]!, 352, 640, 236, 158, config.spread.inset.crop);
              spacedCaps(ctx, config.spread.inset.caption, 352, 826, 12, 5, "rgba(46,38,28,0.7)");
            }
            ctx.font = `300 15px ${bodyFont}`;
            ctx.fillStyle = "rgba(46,38,28,0.55)";
            ctx.fillText("13", 52, 828);
            paperFinish(ctx, 640, 860, 900);
          }

          // duas páginas em V suave, como revista aberta pousada no espaço
          addPanel(left, 3, [-1.55, 1.6, -5.4], 0.34, {});
          addPanel(right, 3, [1.55, 1.6, -5.55], -0.34, {});
        }

        // ---------- 3 · A PAREDE DE COLAGEM (camadas com paralaxe real) ----------
        {
          // base: impressão grande
          const base = document.createElement("canvas");
          base.width = 900; base.height = 640;
          {
            const ctx = base.getContext("2d")!;
            ctx.fillStyle = "#ede5d2";
            ctx.fillRect(0, 0, 900, 640);
            drawPhoto(ctx, images[config.collage.base]!, 30, 30, 840, 580);
            drawTape(ctx, 110, 34, 130, -0.12);
            drawTape(ctx, 790, 38, 130, 0.14);
            paperFinish(ctx, 900, 640, 1100);
          }
          addPanel(base, 6.2, [0, 1.9, -10.6], 0.05, { hang: true, sway: 0.006 });

          // fragmentos rasgados por cima, em profundidades diferentes
          const fragments = config.collage.fragments
            .map((fragment) => ({ ...fragment, image: images[fragment.photo] as HTMLImageElement }))
            .filter((fragment) => Boolean(fragment.image));

          fragments.forEach((fragment, index) => {
            const cropRatio =
              (fragment.image.width * fragment.crop[2]) / (fragment.image.height * fragment.crop[3]);
            const canvas = document.createElement("canvas");
            canvas.width = 560;
            canvas.height = Math.round(560 / cropRatio);
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#f0e9d8";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawPhoto(ctx, fragment.image, 14, 14, canvas.width - 28, canvas.height - 28, fragment.crop);
            drawTape(ctx, canvas.width / 2, 18, 110, (index % 2 ? 1 : -1) * 0.1);
            tearEdges(ctx, canvas.width, canvas.height, 37 + index * 13, fragment.edges);
            paperFinish(ctx, canvas.width, canvas.height, 500);
            addPanel(canvas, fragment.w, fragment.pos, (index % 2 ? -1 : 1) * 0.06, {
              tilt: fragment.tilt,
              hang: index < 2,
              sway: 0.012
            });
          });

          // palavra vertical impressa ao lado da parede
          const word = document.createElement("canvas");
          word.width = 160; word.height = 900;
          {
            const ctx = word.getContext("2d")!;
            ctx.clearRect(0, 0, 160, 900);
            ctx.save();
            ctx.translate(112, 40);
            ctx.rotate(Math.PI / 2);
            spacedCaps(ctx, config.collage.word, 0, 0, 30, 14, "rgba(240,234,220,0.85)");
            ctx.restore();
          }
          addPanel(word, 0.7, [-3.9, 2, -10.3], 0.15, {});
        }

        // ---------- 3b · A PÁGINA DE COMPRAS (produtos impressos na revista) ----------
        if (config.shopping && shopItems.length) {
          const loadRemote = (src: string) =>
            new Promise<HTMLImageElement | null>((resolve) => {
              const image = new Image();
              image.crossOrigin = "anonymous";
              image.onload = () => resolve(image);
              image.onerror = () => resolve(null);
              image.src = src;
            });

          const items = shopItems.slice(0, 3);
          const photos = await Promise.all(
            items.map((item) => (item.image ? loadRemote(item.image) : Promise.resolve(null)))
          );
          if (!alive) return;

          const canvas = document.createElement("canvas");
          canvas.width = 640; canvas.height = 880;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#f0e9d8";
          ctx.fillRect(0, 0, 640, 880);

          spacedCaps(ctx, config.shopping.title, 52, 96, 24, 10, "rgba(40,32,24,0.92)");
          ctx.fillStyle = "rgba(46,38,28,0.7)";
          ctx.fillRect(52, 118, 180, 2);

          items.forEach((item, index) => {
            const y = 160 + index * 216;
            const photo = photos[index];
            if (photo) {
              // recorte a preencher 150×180 (cover-fit)
              const boxW = 150, boxH = 180;
              const scale = Math.max(boxW / photo.width, boxH / photo.height);
              const sw = boxW / scale, sh = boxH / scale;
              const sx = (photo.width - sw) / 2, sy = (photo.height - sh) / 2;
              ctx.drawImage(photo, sx, sy, sw, sh, 52, y, boxW, boxH);
              ctx.save();
              ctx.globalCompositeOperation = "multiply";
              ctx.fillStyle = "rgba(196,172,138,0.18)";
              ctx.fillRect(52, y, boxW, boxH);
              ctx.restore();
              ctx.strokeStyle = "rgba(46,38,28,0.25)";
              ctx.lineWidth = 1;
              ctx.strokeRect(52.5, y + 0.5, boxW - 1, boxH - 1);
            }
            const textX = photo ? 232 : 52;
            spacedCaps(ctx, `N.º 0${index + 1}`, textX, y + 34, 13, 6, "rgba(46,38,28,0.6)");
            const title = String(item.title || "").slice(0, 34);
            spacedCaps(ctx, title, textX, y + 66, 15, 4, "rgba(40,32,24,0.9)");
            if (item.price !== undefined && item.price !== null && String(item.price) !== "") {
              ctx.font = `italic 400 30px ${displayFont}`;
              ctx.fillStyle = "rgba(40,32,24,0.85)";
              ctx.fillText(`€ ${item.price}`, textX, y + 116);
            }
            ctx.fillStyle = "rgba(46,38,28,0.3)";
            ctx.fillRect(textX, y + 152, 356 - (textX - 52), 1);
          });

          const noteY = 160 + items.length * 216 + 20;
          ctx.font = `300 14px ${bodyFont}`;
          ctx.fillStyle = "rgba(52,44,34,0.7)";
          ctx.fillText(config.shopping.note.slice(0, 70), 52, Math.min(noteY, 828));
          ctx.textAlign = "right";
          ctx.font = `300 15px ${bodyFont}`;
          ctx.fillText("27", 588, 836);
          ctx.textAlign = "left";
          paperFinish(ctx, 640, 880, 900);

          addPanel(canvas, 2.7, [1.6, 1.7, -13.2], -0.16, { hang: true, sway: 0.007 });
        }

        // ---------- 4 · O TRÍPTICO DO ARQUIVO ----------
        {
          const picks = config.triptych
            .map((item) => ({ ...item, image: images[item.photo] as HTMLImageElement }))
            .filter((item) => Boolean(item.image));
          picks.forEach(({ image, caption, crop }, index) => {
            const canvas = document.createElement("canvas");
            canvas.width = 520; canvas.height = 760;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#efe8d6";
            ctx.fillRect(0, 0, 520, 760);
            drawPhoto(ctx, image, 30, 30, 460, 620, crop);
            spacedCaps(ctx, caption, 30, 706, 16, 8, "rgba(46,38,28,0.78)");
            ctx.font = `italic 400 24px ${displayFont}`;
            ctx.fillStyle = "rgba(46,38,28,0.6)";
            ctx.textAlign = "right";
            ctx.fillText(`0${index + 1}`, 490, 710);
            ctx.textAlign = "left";
            paperFinish(ctx, 520, 760, 800);

            addPanel(canvas, 2.5, [(index - 1) * 3.1, 1.8, -16 - Math.abs(index - 1) * 0.5], (1 - index) * 0.16, {
              hang: true,
              tilt: (index - 1) * 0.03,
              sway: 0.008
            });
          });
        }
      })
      .catch(() => {
        // sem imagens, o mundo continua com o cenário base
      });

    // ---------------- interação e loop ----------------
    const pointer = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let frame = 0;
    let tabVisible = true;
    let stageVisible = true;
    let running = true;

    function updateRunning() {
      const next = tabVisible && stageVisible;
      if (next && !running) {
        running = true;
        clock.getDelta();
        loop();
      } else {
        running = next;
      }
    }
    const onVisibility = () => {
      tabVisible = document.visibilityState === "visible";
      updateRunning();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const observer = new IntersectionObserver(
      (entries) => {
        stageVisible = entries[0]?.isIntersecting !== false;
        updateRunning();
      },
      { threshold: 0.01 }
    );
    observer.observe(mount);

    const cameraLook = new THREE.Vector3();

    function loop() {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      const progress = reduced ? 0 : progressRef.current;

      const scaled = Math.min(progress / 0.92, 1) * (PATH.length - 1);
      const segment = Math.min(Math.floor(scaled), PATH.length - 2);
      const local = smooth(scaled - segment);
      camera.position.lerpVectors(PATH[segment].pos, PATH[segment + 1].pos, local);
      cameraLook.lerpVectors(PATH[segment].look, PATH[segment + 1].look, local);
      camera.position.x += pointer.x * 0.4 + Math.sin(t * 0.05) * 0.15;
      camera.position.y += -pointer.y * 0.25;
      camera.lookAt(cameraLook);

      if (coverDoor) {
        const open = smooth(Math.min(Math.max((progress - 0.1) / 0.16, 0), 1));
        if (isZoom) {
          coverDoor.rotation.z = open * 2.6 + Math.sin(t * 0.4) * 0.006;
        } else {
          coverDoor.rotation.y = -open * 2.3 + Math.sin(t * 0.3) * 0.008;
        }
      }

      const galleryAmount = smooth(Math.min(Math.max((progress - 0.38) / 0.25, 0), 1));
      hemisphere.intensity = 0.7 - galleryAmount * 0.26;
      sun.intensity = 2 - galleryAmount * 0.9;
      gallery.intensity = galleryAmount * 26;
      warm.position.x += (pointer.x * 6 - warm.position.x) * 0.04;
      warm.position.y += (-pointer.y * 3 + 3 - warm.position.y) * 0.04;

      swayers.forEach(({ mesh, amp, speed, phase }) => {
        mesh.rotation.z = Math.sin(t * speed + phase) * amp;
      });

      bokeh.forEach((sprite, index) => {
        sprite.material.opacity = 0.1 + Math.sin(t * 0.5 + index * 2.1) * 0.045;
      });

      renderer.render(scene, camera);
    }
    loop();

    return () => {
      alive = false;
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [progressRef, edition]);

  return <div ref={mountRef} className="sx-world" aria-hidden="true" />;
}
