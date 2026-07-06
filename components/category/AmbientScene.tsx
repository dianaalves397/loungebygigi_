"use client";

// Cenas 3D das categorias — vinhetas compostas, com direção de arte:
// • summer/riviera — regata ao fim de tarde: dois iates à vela, lua com halo,
//   reflexo na água, gaivotas ao longe
// • sports/court  — putting green: colinas de relva, árvores de topiaria,
//   bandeira a ondular, bola junto ao buraco, sombras de contacto
// • loungewear    — atelier: varão de latão com cabides e sedas penduradas
//   a ondular, brilho quente de fim de tarde
// • acessórios    — vitrine: anéis de ouro e um colar de pérolas suspenso
// • atelier       — o selo de latão da marca em rotação serena
// Fundo transparente (gradiente vem do CSS) para o título ficar atrás/à
// frente. Pausa fora do ecrã, DPR limitado, dispose completo, reduced-motion.

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type AmbientTheme = {
  key: "riviera" | "gilded" | "court" | "silk" | "atelier";
  light: string;
};

function radialTexture(inner = "rgba(255,255,255,1)", mid = "rgba(255,255,255,0.4)") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.45, mid);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export default function AmbientScene({ theme }: { theme: AmbientTheme }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const isMobile = width < 720;

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 10);

    scene.add(new THREE.AmbientLight(0xffe9cf, 0.55));
    const rim = new THREE.DirectionalLight(0xf2eee6, 1.7);
    rim.position.set(-5, 6, 4);
    scene.add(rim);
    const warm = new THREE.PointLight(new THREE.Color(theme.light), 42, 44, 1.9);
    warm.position.set(4, 3, 6);
    scene.add(warm);

    const disposables: Array<{ dispose: () => void }> = [];
    const spinners: Array<{ mesh: THREE.Object3D; x: number; y: number }> = [];
    const swayers: Array<{ mesh: THREE.Object3D; amp: number; speed: number; axis: "z" | "x" }> = [];
    const cloths: Array<{ mesh: THREE.Mesh; amp: number; freq: number }> = [];
    const glows: THREE.Sprite[] = [];
    let water: THREE.Mesh | null = null;
    let moonLane: THREE.Mesh | null = null;
    let boats: THREE.Group[] = [];
    let birds: THREE.Group[] = [];
    let flagCloth: THREE.Mesh | null = null;

    const anchorX = isMobile ? 0 : 1.6;
    const scale = isMobile ? 0.78 : 1;

    const dotTexture = radialTexture();
    disposables.push(dotTexture);

    function material(options: THREE.MeshStandardMaterialParameters) {
      const mat = new THREE.MeshStandardMaterial(options);
      disposables.push(mat);
      return mat;
    }
    function geo<T extends THREE.BufferGeometry>(geometry: T): T {
      disposables.push(geometry);
      return geometry;
    }

    // halo luminoso (lua, sol, brilhos de joalharia)
    function addGlow(x: number, y: number, z: number, size: number, color: string, opacity: number) {
      const glowMaterial = new THREE.SpriteMaterial({
        map: dotTexture,
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      disposables.push(glowMaterial);
      const sprite = new THREE.Sprite(glowMaterial);
      sprite.position.set(x, y, z);
      sprite.scale.setScalar(size);
      scene.add(sprite);
      glows.push(sprite);
      return sprite;
    }

    // sombra de contacto no chão (dá peso e "acabamento" à cena)
    function addShadow(x: number, y: number, z: number, radius: number, opacity = 0.35) {
      const shadowMaterial = new THREE.MeshBasicMaterial({
        map: dotTexture,
        color: 0x000000,
        transparent: true,
        opacity,
        depthWrite: false
      });
      disposables.push(shadowMaterial);
      const shadow = new THREE.Mesh(geo(new THREE.PlaneGeometry(radius * 2, radius * 1.1)), shadowMaterial);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(x, y, z);
      scene.add(shadow);
    }

    function addCloth(
      x: number, y: number, z: number,
      w: number, h: number,
      color: string, opacity: number,
      amp: number, freq: number,
      rotX = -0.5
    ) {
      const cloth = new THREE.Mesh(
        geo(new THREE.PlaneGeometry(w, h, Math.max(24, Math.round(w * 5)), 8)),
        material({
          color: new THREE.Color(color),
          roughness: 0.55,
          metalness: 0.05,
          transparent: true,
          opacity,
          side: THREE.DoubleSide
        })
      );
      cloth.position.set(x, y, z);
      cloth.rotation.x = rotX;
      cloth.userData.offset = x + z;
      scene.add(cloth);
      cloths.push({ mesh: cloth, amp, freq });
      return cloth;
    }

    function buildYacht(hullColor: string, sailColor: string, sailOpacity = 0.97) {
      const yacht = new THREE.Group();

      const hull = new THREE.Mesh(
        geo(new THREE.CylinderGeometry(0.42, 0.14, 3.4, 12, 1)),
        material({ color: new THREE.Color(hullColor), roughness: 0.55, metalness: 0.18 })
      );
      hull.rotation.z = Math.PI / 2;
      hull.scale.set(1, 1, 0.55);
      yacht.add(hull);

      const deck = new THREE.Mesh(
        geo(new THREE.BoxGeometry(3, 0.07, 0.48)),
        material({ color: new THREE.Color("#9b8a70"), roughness: 0.7 })
      );
      deck.position.y = 0.22;
      yacht.add(deck);

      const mast = new THREE.Mesh(
        geo(new THREE.CylinderGeometry(0.035, 0.05, 4.4, 8)),
        material({ color: new THREE.Color("#3a2f26"), roughness: 0.55 })
      );
      mast.position.set(0.2, 2.4, 0);
      yacht.add(mast);

      const sailMaterial = material({
        color: new THREE.Color(sailColor),
        roughness: 0.8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: sailOpacity
      });

      const mainGeometry = geo(new THREE.BufferGeometry());
      mainGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array([0.26, 0.4, 0, 0.26, 4.4, 0, 2.15, 0.4, 0]), 3)
      );
      mainGeometry.computeVertexNormals();
      yacht.add(new THREE.Mesh(mainGeometry, sailMaterial));

      const jibGeometry = geo(new THREE.BufferGeometry());
      jibGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array([0.14, 0.5, 0, 0.14, 3.6, 0, -1.55, 0.5, 0]), 3)
      );
      jibGeometry.computeVertexNormals();
      yacht.add(new THREE.Mesh(jibGeometry, sailMaterial));

      return yacht;
    }

    // ================= SUMMER / RIVIERA: regata =================
    if (theme.key === "riviera") {
      water = new THREE.Mesh(
        geo(new THREE.PlaneGeometry(52, 30, 84, 46)),
        material({
          color: new THREE.Color("#1c2f46"),
          roughness: 0.3,
          metalness: 0.28,
          transparent: true,
          opacity: 0.95
        })
      );
      water.rotation.x = -Math.PI / 2 + 0.05;
      water.position.set(0, -2.2, -8);
      scene.add(water);

      const moonX = isMobile ? 1.5 : -3.8;
      const moon = new THREE.Mesh(
        geo(new THREE.CircleGeometry(1.05 * scale, 48)),
        new THREE.MeshBasicMaterial({ color: new THREE.Color("#f0e2c4"), transparent: true, opacity: 0.95 })
      );
      disposables.push(moon.material as THREE.Material);
      moon.position.set(moonX, 3, -14);
      scene.add(moon);
      addGlow(moonX, 3, -13.8, 7 * scale, "#e8d3a8", 0.34);

      // reflexo da lua na água
      const laneMaterial = new THREE.MeshBasicMaterial({
        map: dotTexture,
        color: new THREE.Color("#e8d3a8"),
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      disposables.push(laneMaterial);
      moonLane = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.6, 14)), laneMaterial);
      moonLane.rotation.x = -Math.PI / 2 + 0.05;
      moonLane.position.set(moonX, -2.14, -7);
      scene.add(moonLane);

      const mainYacht = buildYacht("#2b2119", "#efe9db");
      mainYacht.scale.setScalar(scale * 0.95);
      mainYacht.position.set(anchorX + (isMobile ? 0 : 0.7), -1.4, -1.4);
      mainYacht.rotation.y = -0.35;
      scene.add(mainYacht);
      boats.push(mainYacht);

      const farYacht = buildYacht("#1c1712", "#cfc5b0", 0.9);
      farYacht.scale.setScalar(scale * 0.4);
      farYacht.position.set(isMobile ? -1.8 : -3.4, -1.7, -7);
      farYacht.rotation.y = 0.4;
      scene.add(farYacht);
      boats.push(farYacht);

      // gaivotas — dois traços finos em V
      for (let b = 0; b < 3; b++) {
        const bird = new THREE.Group();
        const wingMaterial = material({ color: new THREE.Color("#e9e2d2"), roughness: 0.9 });
        const wingGeometry = geo(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6));
        const left = new THREE.Mesh(wingGeometry, wingMaterial);
        left.rotation.z = 0.55;
        left.position.x = -0.17;
        const right = new THREE.Mesh(wingGeometry, wingMaterial);
        right.rotation.z = -0.55;
        right.position.x = 0.17;
        bird.add(left, right);
        bird.scale.setScalar(scale);
        bird.position.set((isMobile ? -0.5 : -1.5) + b * 1.3, 2.4 + (b % 2) * 0.5, -9 - b);
        scene.add(bird);
        birds.push(bird);
      }
    }

    // ================= SPORTS: putting green =================
    if (theme.key === "court") {
      // colina distante (profundidade)
      const farHill = new THREE.Mesh(
        geo(new THREE.PlaneGeometry(60, 12, 30, 8)),
        material({ color: new THREE.Color("#20301c"), roughness: 1 })
      );
      const farAttr = farHill.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < farAttr.count; i++) {
        farAttr.setZ(i, Math.sin(farAttr.getX(i) * 0.22) * 1.1);
      }
      farHill.geometry.computeVertexNormals();
      farHill.position.set(0, 0.4, -18);
      scene.add(farHill);

      // relvado principal ondulado
      const lawn = new THREE.Mesh(
        geo(new THREE.PlaneGeometry(50, 28, 44, 26)),
        material({ color: new THREE.Color("#2e3d2a"), roughness: 0.92 })
      );
      const lawnAttr = lawn.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < lawnAttr.count; i++) {
        const x = lawnAttr.getX(i);
        const y = lawnAttr.getY(i);
        lawnAttr.setZ(i, Math.sin(x * 0.16) * 0.4 + Math.cos(y * 0.12) * 0.3);
      }
      lawn.geometry.computeVertexNormals();
      lawn.rotation.x = -Math.PI / 2 + 0.04;
      lawn.position.set(0, -2.15, -7);
      scene.add(lawn);

      // árvores de topiaria ao fundo
      const foliage = material({ color: new THREE.Color("#26351f"), roughness: 0.95 });
      const trunk = material({ color: new THREE.Color("#332619"), roughness: 0.9 });
      const treeSpots: Array<[number, number, number]> = isMobile
        ? [[-2.6, -10, 1.1], [3, -12, 1.5]]
        : [[-5.5, -11, 1.4], [-3.2, -13, 1.9], [5.5, -10, 1.2]];
      treeSpots.forEach(([x, z, size]) => {
        const tree = new THREE.Group();
        const stem = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.06, 0.09, size * 0.8, 8)), trunk);
        stem.position.y = size * 0.4;
        const crown = new THREE.Mesh(geo(new THREE.SphereGeometry(size * 0.55, 20, 16)), foliage);
        crown.position.y = size * 1.05;
        tree.add(stem, crown);
        tree.position.set(x, -1.9, z);
        scene.add(tree);
        addShadow(x, -1.88, z, size * 0.8, 0.3);
        swayers.push({ mesh: crown, amp: 0.02, speed: 0.6 + size * 0.1, axis: "z" });
      });

      const holeX = anchorX + 0.4;
      const hole = new THREE.Mesh(
        geo(new THREE.CircleGeometry(0.16 * scale, 32)),
        material({ color: new THREE.Color("#10150e"), roughness: 1 })
      );
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(holeX, -1.82, -1.6);
      scene.add(hole);

      const stick = new THREE.Mesh(
        geo(new THREE.CylinderGeometry(0.022, 0.028, 3.2, 8)),
        material({ color: new THREE.Color("#ece5d3"), roughness: 0.35, metalness: 0.35 })
      );
      stick.position.set(holeX, -0.25, -1.6);
      scene.add(stick);

      flagCloth = new THREE.Mesh(
        geo(new THREE.PlaneGeometry(1.1 * scale, 0.6 * scale, 26, 6)),
        material({ color: new THREE.Color("#e9dfc8"), roughness: 0.75, side: THREE.DoubleSide })
      );
      flagCloth.position.set(holeX + 0.56 * scale, 1.12, -1.6);
      scene.add(flagCloth);

      const ball = new THREE.Mesh(
        geo(new THREE.SphereGeometry(0.11 * scale, 28, 20)),
        material({ color: new THREE.Color("#f6f3ea"), roughness: 0.4 })
      );
      ball.position.set(holeX - 1.15, -1.8, -0.9);
      scene.add(ball);
      addShadow(holeX - 1.15, -1.79, -0.9, 0.22, 0.4);
      addShadow(holeX, -1.79, -1.6, 0.3, 0.3);

      addGlow(isMobile ? 1.6 : -4.2, 3.2, -14, 6 * scale, "#f0e5c0", 0.22);
    }

    // ================= LOUNGEWEAR: atelier com varão =================
    if (theme.key === "silk") {
      const brass = material({ color: new THREE.Color("#b3945f"), metalness: 0.9, roughness: 0.25 });

      const railY = 1.7;
      const railWidth = isMobile ? 4.6 : 6.4;
      const railX = anchorX - (isMobile ? 0 : 0.4);

      const rail = new THREE.Mesh(
        geo(new THREE.CylinderGeometry(0.045, 0.045, railWidth, 12)),
        brass
      );
      rail.rotation.z = Math.PI / 2;
      rail.position.set(railX, railY, -1.2);
      scene.add(rail);

      // suportes laterais
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(
          geo(new THREE.CylinderGeometry(0.035, 0.045, railY + 2.1, 10)),
          brass
        );
        leg.position.set(railX + (side * railWidth) / 2, (railY - 2.1) / 2 + 0, -1.2);
        scene.add(leg);
        addShadow(railX + (side * railWidth) / 2, -2.05, -1.2, 0.5, 0.35);
      }

      // cabides + sedas penduradas a ondular
      const silkTones = ["#e7d7b8", "#d3ba92", "#b99e79", "#e0cba8"];
      const hangerCount = isMobile ? 3 : 4;
      for (let h = 0; h < hangerCount; h++) {
        const x = railX - railWidth / 2 + ((h + 1) * railWidth) / (hangerCount + 1);

        const hook = new THREE.Mesh(
          geo(new THREE.TorusGeometry(0.09, 0.018, 10, 24, Math.PI * 1.4)),
          brass
        );
        hook.position.set(x, railY + 0.02, -1.18);
        hook.rotation.z = Math.PI * 0.8;
        scene.add(hook);

        const shoulders = new THREE.Mesh(
          geo(new THREE.TorusGeometry(0.34, 0.02, 10, 28, Math.PI)),
          brass
        );
        shoulders.position.set(x, railY - 0.18, -1.18);
        shoulders.rotation.z = Math.PI;
        scene.add(shoulders);

        const garment = addCloth(
          x, railY - 1.55, -1.16,
          0.72, 2.4,
          silkTones[h % silkTones.length], 0.96,
          0.09, 2.2,
          0
        );
        garment.userData.offset = h * 1.7;
        swayers.push({ mesh: garment, amp: 0.035, speed: 0.5 + h * 0.13, axis: "z" });
        swayers.push({ mesh: hook, amp: 0.03, speed: 0.5 + h * 0.13, axis: "z" });
        swayers.push({ mesh: shoulders, amp: 0.03, speed: 0.5 + h * 0.13, axis: "z" });
      }

      // seda ampla ao fundo, só atmosfera
      addCloth(0, -0.6, -7, 26, 3.6, "#6b573c", 0.3, 0.5, 0.42);
      addGlow(railX + 2.4, 2.6, -4, 5.5 * scale, "#ffdfae", 0.2);
    }

    // ================= ACESSÓRIOS: vitrine =================
    if (theme.key === "gilded") {
      const gold = material({ color: new THREE.Color("#caa458"), metalness: 0.95, roughness: 0.2 });

      const ringSpots: Array<[number, number, number, number]> = [
        [anchorX + 0.7, 0.6, 0, 1.15],
        [anchorX - 1.5, -0.5, -1.8, 0.68]
      ];
      ringSpots.forEach(([x, y, z, r], index) => {
        const ring = new THREE.Mesh(
          geo(new THREE.TorusGeometry(r * scale, (0.12 * r + 0.045) * scale, 32, 100)),
          gold
        );
        ring.position.set(x, y, z);
        ring.rotation.set(0.4 + index, 0.3 * index, 0);
        scene.add(ring);
        spinners.push({ mesh: ring, x: 0.1 + index * 0.05, y: 0.16 - index * 0.03 });
        addGlow(x + r * 0.6, y + r * 0.5, z + 0.2, 1.1 * scale, "#ffe9b8", 0.4);
      });

      // colar de pérolas suspenso (curva de catenária)
      const pearls = new THREE.Group();
      const pearlMaterial = material({
        color: new THREE.Color("#f3ece0"),
        roughness: 0.25,
        metalness: 0.1
      });
      const pearlCount = 15;
      const spanX = 2.6 * scale;
      for (let i = 0; i < pearlCount; i++) {
        const tPos = i / (pearlCount - 1);
        const x = (tPos - 0.5) * spanX;
        const y = Math.cosh((tPos - 0.5) * 2.4) * -0.55 + 0.55; // curva pendurada
        const pearl = new THREE.Mesh(geo(new THREE.SphereGeometry(0.085 * scale, 18, 14)), pearlMaterial);
        pearl.position.set(x, y, 0);
        pearls.add(pearl);
      }
      pearls.position.set(anchorX - 0.3, isMobile ? 2.1 : 1.9, -0.6);
      scene.add(pearls);
      swayers.push({ mesh: pearls, amp: 0.05, speed: 0.4, axis: "z" });

      addCloth(0, -2.4, -6, 26, 3.4, "#4a3a22", 0.35, 0.4, 0.4);
    }

    // ================= ATELIER: selo =================
    if (theme.key === "atelier") {
      const brass = material({ color: new THREE.Color("#a98e5f"), metalness: 0.88, roughness: 0.28 });
      const sealRing = new THREE.Mesh(geo(new THREE.TorusGeometry(1.7 * scale, 0.055 * scale, 24, 130)), brass);
      sealRing.position.set(anchorX + 0.4, 0.5, 0);
      scene.add(sealRing);
      spinners.push({ mesh: sealRing, x: 0.07, y: 0.12 });

      const innerRing = new THREE.Mesh(geo(new THREE.TorusGeometry(1.05 * scale, 0.035 * scale, 20, 100)), brass);
      innerRing.position.copy(sealRing.position);
      innerRing.rotation.x = 0.6;
      scene.add(innerRing);
      spinners.push({ mesh: innerRing, x: -0.09, y: 0.1 });

      addGlow(anchorX + 1.6, 1.4, -0.4, 3.4 * scale, "#ffe4b0", 0.3);
      addCloth(0, -2.2, -5.5, 26, 3.4, "#5c4a30", 0.3, 0.45, 0.45);
    }

    // ------------------- interação e loop -------------------
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
    let heroVisible = true;
    let running = true;

    function updateRunning() {
      const next = tabVisible && heroVisible;
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

    const heroObserver = new IntersectionObserver(
      (entries) => {
        heroVisible = entries[0]?.isIntersecting !== false;
        updateRunning();
      },
      { threshold: 0.02 }
    );
    heroObserver.observe(mount);

    function loop() {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();

      spinners.forEach(({ mesh, x, y }, index) => {
        mesh.rotation.x += x * 0.004;
        mesh.rotation.y += y * 0.004;
        mesh.position.y += Math.sin(t * 0.5 + index * 1.7) * 0.0012;
      });

      swayers.forEach(({ mesh, amp, speed, axis }, index) => {
        mesh.rotation[axis] = Math.sin(t * speed + index) * amp;
      });

      if (water) {
        const attr = (water.geometry as THREE.PlaneGeometry).getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < attr.count; i++) {
          const x = attr.getX(i);
          const y = attr.getY(i);
          attr.setZ(i, Math.sin(x * 0.42 + t * 0.5) * 0.15 + Math.cos(y * 0.3 + t * 0.32) * 0.1);
        }
        attr.needsUpdate = true;
        (water.geometry as THREE.PlaneGeometry).computeVertexNormals();
        if (moonLane) {
          (moonLane.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(t * 0.8) * 0.05;
        }
      }

      boats.forEach((yacht, index) => {
        yacht.position.y = (index === 0 ? -1.4 : -1.7) + Math.sin(t * 0.55 + index * 2) * 0.08;
        yacht.rotation.z = Math.sin(t * 0.5 + index * 2) * 0.045;
        yacht.rotation.x = Math.sin(t * 0.36 + 1 + index) * 0.02;
      });

      birds.forEach((bird, index) => {
        bird.position.x += 0.0035 * (index % 2 ? 1 : 0.8);
        bird.position.y += Math.sin(t * 2 + index) * 0.0015;
        if (bird.position.x > 9) bird.position.x = -9;
        bird.children.forEach((wing, wingIndex) => {
          wing.rotation.z = (wingIndex === 0 ? 0.55 : -0.55) + Math.sin(t * 6 + index) * 0.25 * (wingIndex === 0 ? 1 : -1);
        });
      });

      if (flagCloth) {
        const attr = (flagCloth.geometry as THREE.PlaneGeometry).getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < attr.count; i++) {
          const x = attr.getX(i);
          attr.setZ(i, Math.sin(x * 4 + t * 3.2) * 0.05 * (x + 0.6));
        }
        attr.needsUpdate = true;
        (flagCloth.geometry as THREE.PlaneGeometry).computeVertexNormals();
      }

      cloths.forEach(({ mesh, amp, freq }) => {
        const attr = (mesh.geometry as THREE.PlaneGeometry).getAttribute("position") as THREE.BufferAttribute;
        const offset = mesh.userData.offset as number;
        for (let i = 0; i < attr.count; i++) {
          const x = attr.getX(i);
          const y = attr.getY(i);
          attr.setZ(i, Math.sin(x * freq + t * 0.6 + offset) * amp + Math.sin((x + y) * 0.3 + t * 0.3) * amp * 0.5);
        }
        attr.needsUpdate = true;
        (mesh.geometry as THREE.PlaneGeometry).computeVertexNormals();
      });

      glows.forEach((glow, index) => {
        const base = glow.scale.x;
        glow.material.opacity = Math.max(0.12, (glow.material.opacity || 0.3) + Math.sin(t * 1.2 + index * 2) * 0.002);
        glow.scale.setScalar(base + Math.sin(t * 0.9 + index) * 0.004);
      });

      warm.position.x += (pointer.x * 6 - warm.position.x) * 0.03;
      warm.position.y += (-pointer.y * 3.4 + 3 - warm.position.y) * 0.03;
      camera.position.x += (pointer.x * 0.45 - camera.position.x) * 0.02;
      camera.position.y += (-pointer.y * 0.3 + 0.6 - camera.position.y) * 0.02;
      camera.lookAt(isMobile ? 0 : 0.6, 0.1, -1.5);

      renderer.render(scene, camera);
    }
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      heroObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  return <div ref={mountRef} className="lgc-scene" aria-hidden="true" />;
}
