"use client";

// A FLORAÇÃO — uma flor-mãe realista a desabrochar no centro (pétalas
// translúcidas com transmissão de luz, gradientes iridescentes, rim light),
// e flores-filhas a nascer dela ao longo do scroll, sobre fundo de tinta
// escura como nas referências. Tudo conduzido pelo progresso do scroll:
// 0–0.35 o botão abre pétala a pétala; 0.35–1 os rebentos crescem e a
// câmara orbita lentamente.

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

function smooth(v: number) {
  return v * v * (3 - 2 * v);
}
function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

const PALETTES = {
  woman: {
    petalA: "#f6d9e2",
    petalB: "#d98fa8",
    petalDeep: "#8e4a63",
    glow: 0xffd9e8,
    heart: 0xc9a24b,
    stem: 0x4f6b52
  },
  man: {
    petalA: "#efe6c8",
    petalB: "#c9b478",
    petalDeep: "#6e5a2a",
    glow: 0xf3e6b8,
    heart: 0x8a6f34,
    stem: 0x3d4a38
  }
} as const;

export default function FlowerGarden({
  progressRef,
  variant
}: {
  progressRef: MutableRefObject<number>;
  variant: "woman" | "man";
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 760;
    const palette = PALETTES[variant];

    const disposables: Array<{ dispose: () => void }> = [];
    const keep = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };
    const toTexture = (canvas: HTMLCanvasElement) => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 8;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isMobile ? 50 : 40, 1, 0.1, 60);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    // luz de estúdio escuro: contra-luz forte (as pétalas acendem por trás)
    scene.add(new THREE.AmbientLight(0x2a3038, 1.4));
    const back = new THREE.PointLight(palette.glow, 26, 30, 1.8);
    back.position.set(0.4, 1.6, -2.6);
    scene.add(back);
    const rim = new THREE.PointLight(0xbcd4ff, 8, 24, 2);
    rim.position.set(-2.6, 0.6, 1.4);
    scene.add(rim);
    const front = new THREE.DirectionalLight(0xfff2e0, 0.55);
    front.position.set(1.4, 2.2, 4);
    scene.add(front);

    // ---------- textura de pétala: gradiente nacarado + veios finos ----------
    function petalTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 512;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 512, 0, 0);
      gradient.addColorStop(0, palette.petalDeep);
      gradient.addColorStop(0.35, palette.petalB);
      gradient.addColorStop(0.8, palette.petalA);
      gradient.addColorStop(1, "#ffffff");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 512);
      // iridescência suave nas margens
      const side = ctx.createLinearGradient(0, 0, 256, 0);
      side.addColorStop(0, "rgba(150,190,255,0.28)");
      side.addColorStop(0.5, "rgba(255,255,255,0)");
      side.addColorStop(1, "rgba(255,190,220,0.28)");
      ctx.fillStyle = side;
      ctx.fillRect(0, 0, 256, 512);
      // veios
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.moveTo(128, 506);
        ctx.quadraticCurveTo(128 + (i - 7) * 16, 300, 128 + (i - 7) * 30, 24);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(120,60,90,0.25)";
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(128, 508);
        ctx.quadraticCurveTo(128 + (i - 3) * 24, 320, 128 + (i - 3) * 44, 40);
        ctx.stroke();
      }
      return keep(toTexture(canvas));
    }
    const sharedPetalTexture = petalTexture();

    // material translúcido: a luz atravessa (transmissão) e acende as bordas
    function petalMaterial() {
      return keep(
        new THREE.MeshPhysicalMaterial({
          map: sharedPetalTexture,
          side: THREE.DoubleSide,
          roughness: 0.35,
          metalness: 0,
          transmission: 0.5,
          thickness: 0.25,
          ior: 1.3,
          transparent: true,
          opacity: 0.96,
          emissive: new THREE.Color(palette.petalB),
          emissiveIntensity: 0.08,
          sheen: 0.6,
          sheenColor: new THREE.Color("#ffffff")
        })
      );
    }

    // ---------- pétala: superfície ondulada com ponta recurvada ----------
    function petalGeometry(length: number, width: number) {
      const geometry = new THREE.PlaneGeometry(width, length, 10, 18);
      const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        const x = attr.getX(i);
        const y = attr.getY(i) + length / 2;
        const along = y / length;
        const edge = Math.abs(x) / (width / 2);
        // silhueta: larga ao meio, ponta arredondada
        attr.setX(i, x * (0.35 + Math.sin(Math.min(along * 1.05, 1) * Math.PI) * 0.85));
        // concha + ondulação nas margens + ponta a recurvar para fora
        const cup = (x * x) * 1.6;
        const ripple = Math.sin(along * 9 + x * 7) * 0.02 * edge * along;
        const flare = Math.pow(along, 3) * 0.34;
        attr.setZ(i, cup + ripple - Math.sin(along * Math.PI) * 0.16 + flare);
      }
      geometry.translate(0, length / 2, 0);
      geometry.computeVertexNormals();
      return keep(geometry);
    }

    // ---------- uma flor: camadas de pétalas com abertura animável ----------
    type Bloom = {
      group: THREE.Group;
      petals: Array<{ holder: THREE.Group; closed: number; open: number; layerDelay: number }>;
      heart: THREE.Object3D;
    };
    function makeBloom(scale: number): Bloom {
      const group = new THREE.Group();
      const material = petalMaterial();
      const petals: Bloom["petals"] = [];
      const layers = [
        { count: 5, length: 0.5, width: 0.34, open: 1.85, delay: 0.45 },
        { count: 6, length: 0.68, width: 0.42, open: 1.5, delay: 0.3 },
        { count: 7, length: 0.82, width: 0.48, open: 1.15, delay: 0.15 },
        { count: 8, length: 0.92, width: 0.5, open: 0.85, delay: 0 }
      ];
      layers.forEach((layer, layerIndex) => {
        const geometry = petalGeometry(layer.length, layer.width);
        for (let i = 0; i < layer.count; i++) {
          const petal = new THREE.Mesh(geometry, material);
          const holder = new THREE.Group();
          holder.rotation.y = (i / layer.count) * Math.PI * 2 + layerIndex * 0.45;
          holder.add(petal);
          group.add(holder);
          // fechado: quase vertical (botão); aberto: inclinação da camada
          petals.push({ holder, closed: 0.1 + layerIndex * 0.03, open: layer.open, layerDelay: layer.delay });
          petal.rotation.x = 0.1;
        }
      });
      // coração com estames
      const heart = new THREE.Group();
      const core = new THREE.Mesh(
        keep(new THREE.SphereGeometry(0.09, 16, 12)),
        keep(new THREE.MeshStandardMaterial({ color: palette.heart, roughness: 0.45, emissive: palette.heart, emissiveIntensity: 0.25 }))
      );
      heart.add(core);
      for (let i = 0; i < 9; i++) {
        const stamen = new THREE.Mesh(
          keep(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 5)),
          keep(new THREE.MeshStandardMaterial({ color: palette.heart, roughness: 0.5, emissive: palette.heart, emissiveIntensity: 0.35 }))
        );
        const angle = (i / 9) * Math.PI * 2;
        stamen.position.set(Math.cos(angle) * 0.05, 0.14, Math.sin(angle) * 0.05);
        stamen.rotation.set(Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5);
        heart.add(stamen);
        const tip = new THREE.Mesh(
          keep(new THREE.SphereGeometry(0.016, 8, 6)),
          keep(new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffdf9a, emissiveIntensity: 0.6 }))
        );
        tip.position.set(Math.cos(angle) * 0.14, 0.28, Math.sin(angle) * 0.14);
        heart.add(tip);
      }
      group.add(heart);
      group.scale.setScalar(scale);
      return { group, petals, heart };
    }

    function setBloomOpen(bloom: Bloom, amount: number) {
      for (const petal of bloom.petals) {
        const local = clamp01((amount - petal.layerDelay) / (1 - petal.layerDelay + 0.0001));
        const eased = smooth(local);
        petal.holder.children[0].rotation.x = petal.closed + (petal.open - petal.closed) * eased;
      }
      bloom.heart.scale.setScalar(0.4 + smooth(clamp01(amount * 1.6)) * 0.6);
    }

    // ---------- caule com curva ----------
    function makeStem(points: THREE.Vector3[], radius: number) {
      const curve = new THREE.CatmullRomCurve3(points);
      const mesh = new THREE.Mesh(
        keep(new THREE.TubeGeometry(curve, 24, radius, 7, false)),
        keep(new THREE.MeshStandardMaterial({ color: palette.stem, roughness: 0.7 }))
      );
      return mesh;
    }

    // ---------- a flor-mãe ----------
    const mother = makeBloom(1.4);
    mother.group.position.set(0, 0.15, 0);
    scene.add(mother.group);
    scene.add(makeStem([
      new THREE.Vector3(0.12, -3.4, 0),
      new THREE.Vector3(-0.08, -2, 0.06),
      new THREE.Vector3(0.06, -0.8, -0.04),
      new THREE.Vector3(0, 0.1, 0)
    ], 0.045));

    // ---------- as filhas: nascem da mãe ao longo do scroll ----------
    type Child = { bloom: Bloom; stem: THREE.Mesh; birth: number; target: THREE.Vector3 };
    const children: Child[] = [];
    const childSpots: Array<[number, number, number, number]> = [
      // [x, y, z, nascimento(progresso)]
      [1.35, 0.85, -0.5, 0.38],
      [-1.5, 0.55, -0.9, 0.46],
      [0.95, -0.85, 0.55, 0.54],
      [-1.05, -1.05, -0.25, 0.62],
      [1.9, -0.15, -1.4, 0.7],
      [-2.05, -0.35, 0.8, 0.78],
      [0.35, 1.55, -1.1, 0.84]
    ];
    const spotCount = isMobile ? 5 : childSpots.length;
    for (let i = 0; i < spotCount; i++) {
      const [x, y, z, birth] = childSpots[i];
      const target = new THREE.Vector3(x, y, z);
      const bloom = makeBloom(0.45 + (i % 3) * 0.12);
      bloom.group.position.copy(target);
      bloom.group.rotation.set((Math.random() - 0.5) * 0.7, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.7);
      bloom.group.visible = false;
      scene.add(bloom.group);
      const stem = makeStem([
        new THREE.Vector3(0, 0.1, 0),
        new THREE.Vector3(x * 0.4, y * 0.4 + 0.1, z * 0.4),
        new THREE.Vector3(x * 0.75, y * 0.75, z * 0.75),
        target.clone()
      ], 0.02);
      stem.visible = false;
      scene.add(stem);
      children.push({ bloom, stem, birth, target });
    }

    // ---------- pó de luz (partículas a subir) ----------
    const dustGeometry = keep(new THREE.BufferGeometry());
    const dustCount = isMobile ? 90 : 160;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 7;
      dustPositions[i * 3 + 1] = -3 + Math.random() * 6;
      dustPositions[i * 3 + 2] = -2 + Math.random() * 4;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      keep(new THREE.PointsMaterial({ color: palette.glow, size: 0.02, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }))
    );
    scene.add(dust);

    const clock = new THREE.Clock();
    let raf = 0;
    const renderLoop = () => {
      const t = clock.getElapsedTime();
      const progress = reduced ? 0.7 : progressRef.current;

      // fase 1: a mãe desabrocha (0 → 0.35), com respiração subtil
      const openAmount = clamp01(progress / 0.35);
      setBloomOpen(mother, openAmount * (1 + Math.sin(t * 0.9) * 0.012));
      mother.group.rotation.y = t * 0.06 + progress * 1.1;

      // fase 2: as filhas nascem — caule estica, botão cresce e abre
      for (const child of children) {
        const life = clamp01((progress - child.birth) / 0.16);
        const grow = smooth(life);
        child.stem.visible = life > 0;
        child.stem.scale.setScalar(Math.max(grow, 0.0001));
        child.bloom.group.visible = life > 0.25;
        const bloomLife = clamp01((life - 0.25) / 0.75);
        child.bloom.group.position.lerpVectors(new THREE.Vector3(0, 0.1, 0), child.target, grow);
        child.bloom.group.scale.setScalar(Math.max(smooth(bloomLife), 0.0001) * (0.45 + 0.12));
        setBloomOpen(child.bloom, bloomLife);
        child.bloom.group.rotation.y += 0.0015;
      }

      // câmara: aproxima no desabrochar, depois orbita devagar
      const orbit = smooth(clamp01((progress - 0.3) / 0.7));
      const angle = orbit * 1.5 + Math.sin(t * 0.1) * 0.04;
      const distance = 4.6 - openAmount * 1.2 + orbit * 1.4;
      camera.position.set(Math.sin(angle) * distance, 0.3 + orbit * 0.5, Math.cos(angle) * distance);
      camera.lookAt(0, 0.15 + orbit * 0.1, 0);

      const dustAttr = dust.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < dustAttr.count; i++) {
        dustAttr.setY(i, dustAttr.getY(i) + 0.0025);
        if (dustAttr.getY(i) > 3.2) dustAttr.setY(i, -3);
      }
      dustAttr.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);
    renderLoop();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [progressRef, variant]);

  return <div ref={mountRef} className="ax-world" aria-hidden="true" />;
}
