"use client";

// Cenas 3D dos acessórios.
// "sea": o brinco torna-se estrela-do-mar levada pela corrente, num fundo
//        de diorama de papel — corais recortados, algas, bolhas, raios de luz.
// "sun": o pendente torna-se o sol dourado — raios metálicos, nuvens de
//        papel, o mar ao fundo — e o dia passa com o scroll.

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

function smooth(v: number) {
  return v * v * (3 - 2 * v);
}

export default function AccessoryScene({
  progressRef,
  variant
}: {
  progressRef: MutableRefObject<number>;
  variant: "sea" | "sun";
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 760;

    const disposables: Array<{ dispose: () => void }> = [];
    const keep = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };
    const toTexture = (canvas: HTMLCanvasElement) => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isMobile ? 52 : 42, 1, 0.1, 90);
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    const swayers: Array<{ mesh: THREE.Object3D; amp: number; speed: number; phase: number; axis?: "x" | "z" }> = [];

    // ---------- forma de estrela (partilhada: estrela-do-mar e sol) ----------
    function starShape(points: number, outer: number, inner: number, round = 0.35) {
      const shape = new THREE.Shape();
      for (let i = 0; i <= points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? outer : inner;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) shape.moveTo(x, y);
        else {
          const prev = ((i - 0.5) / (points * 2)) * Math.PI * 2 - Math.PI / 2;
          const pr = i % 2 === 0 ? inner * (1 + round) : outer * (1 - round * 0.4);
          shape.quadraticCurveTo(Math.cos(prev) * pr, Math.sin(prev) * pr, x, y);
        }
      }
      return shape;
    }

    // fases: 0–0.26 = revelação sobre a fotografia (só o protagonista);
    //         0.26–1 = a viagem no mundo
    const INTRO = 0.26;
    const envGroup = new THREE.Group();
    scene.add(envGroup);

    // o corredor segue o percurso da estrela: nada de vazio
    const pathXAt = (z: number) => {
      const zs = [1.2, -2.5, -6.5, -10.5, -14.5];
      const xs = [0, 0.4, -1.2, 0.8, -0.4];
      if (z >= zs[0]) return xs[0];
      for (let i = 0; i < zs.length - 1; i++) {
        if (z <= zs[i] && z >= zs[i + 1]) {
          const local = (zs[i] - z) / (zs[i] - zs[i + 1]);
          return xs[i] + (xs[i + 1] - xs[i]) * local;
        }
      }
      return xs[xs.length - 1];
    };

    if (variant === "sea") {
      // =================== O FUNDO DO MAR ===================
      scene.add(new THREE.HemisphereLight(0xbfe3de, 0x0c2a30, 0.9));
      const sun = new THREE.DirectionalLight(0xfff2cf, 0.9);
      sun.position.set(4, 10, 2);
      scene.add(sun);

      // areia do fundo com manchas de cáustica
      const sandCanvas = document.createElement("canvas");
      sandCanvas.width = sandCanvas.height = 1024;
      {
        const ctx = sandCanvas.getContext("2d")!;
        ctx.fillStyle = "#c9bd9d";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.strokeStyle = "rgba(120,140,130,0.3)";
        for (let i = 0; i < 16; i++) {
          ctx.lineWidth = 2 + Math.random() * 2;
          ctx.beginPath();
          const y = 60 + i * 62;
          ctx.moveTo(-30, y);
          ctx.bezierCurveTo(300, y + 30, 720, y - 30, 1060, y + 12);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(240,250,240,0.14)";
        for (let i = 0; i < 30; i++) {
          ctx.beginPath();
          ctx.ellipse(Math.random() * 1024, Math.random() * 1024, 40 + Math.random() * 90, 14 + Math.random() * 26, Math.random(), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const floor = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(60, 60)),
        keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(sandCanvas)), roughness: 1 }))
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -1.9, -10);
      envGroup.add(floor);

      // corais de papel recortado
      function coralCanvas(color: string, kind: number) {
        const canvas = document.createElement("canvas");
        canvas.width = 512; canvas.height = 640;
        const ctx = canvas.getContext("2d")!;
        ctx.lineCap = "round";
        ctx.strokeStyle = color;
        function branch(x: number, y: number, angle: number, length: number, width: number, depth: number) {
          if (depth <= 0 || width < 3) return;
          const nx = x + Math.cos(angle) * length;
          const ny = y - Math.sin(angle) * length;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          const spread = kind === 0 ? 0.55 : 0.85;
          branch(nx, ny, angle + spread * (0.6 + Math.random() * 0.5), length * 0.74, width * 0.68, depth - 1);
          branch(nx, ny, angle - spread * (0.6 + Math.random() * 0.5), length * 0.74, width * 0.68, depth - 1);
          if (Math.random() > 0.6) branch(nx, ny, angle + (Math.random() - 0.5) * 0.3, length * 0.7, width * 0.6, depth - 1);
        }
        branch(256, 640, Math.PI / 2, 130, 30, 6);
        // contorno de autocolante
        const outline = document.createElement("canvas");
        outline.width = 512; outline.height = 640;
        const octx = outline.getContext("2d")!;
        for (const [dx, dy] of [[-6,0],[6,0],[0,-6],[0,6],[-4,-4],[4,4],[-4,4],[4,-4]] as const) {
          octx.drawImage(canvas, dx, dy);
        }
        octx.globalCompositeOperation = "source-in";
        octx.fillStyle = "#f2ecdb";
        octx.fillRect(0, 0, 512, 640);
        octx.globalCompositeOperation = "source-over";
        octx.drawImage(canvas, 0, 0);
        return outline;
      }
      const coralColors = ["#d98b7f", "#c9a24b", "#7fa8a2", "#b76e79", "#5c8784"];
      for (let i = 0; i < (isMobile ? 6 : 9); i++) {
        const canvas = coralCanvas(coralColors[i % coralColors.length], i % 2);
        const height = 1.6 + Math.random() * 2.2;
        const coral = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(height * 0.8, height)),
          keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(canvas)), transparent: true, roughness: 0.95, side: THREE.DoubleSide }))
        );
        const z = -3 - i * 1.9 - Math.random() * 1.2;
        const x = (i % 2 === 0 ? -1 : 1) * (1.8 + Math.random() * 2.6);
        coral.position.set(x, -2.4 + height / 2, z);
        coral.rotation.y = (Math.random() - 0.5) * 0.5;
        envGroup.add(coral);
        swayers.push({ mesh: coral, amp: 0.02 + Math.random() * 0.02, speed: 0.5 + Math.random() * 0.4, phase: Math.random() * 6, axis: "z" });
      }

      // algas altas
      for (let i = 0; i < (isMobile ? 5 : 8); i++) {
        const height = 2.4 + Math.random() * 2;
        const weed = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(0.16, height, 1, 8)),
          keep(new THREE.MeshStandardMaterial({ color: 0x3f6f5f, transparent: true, opacity: 0.85, side: THREE.DoubleSide, roughness: 1 }))
        );
        weed.position.set((Math.random() - 0.5) * 9, -2.4 + height / 2, -4 - Math.random() * 13);
        envGroup.add(weed);
        swayers.push({ mesh: weed, amp: 0.08, speed: 0.6 + Math.random() * 0.5, phase: Math.random() * 6, axis: "z" });
      }

      // raios de luz
      for (let i = 0; i < 3; i++) {
        const ray = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(1.6 + i, 16)),
          keep(new THREE.MeshBasicMaterial({ color: 0xdff3e4, transparent: true, opacity: 0.06, depthWrite: false }))
        );
        ray.position.set(pathXAt(-4 - i * 4), 4, -4 - i * 4);
        ray.rotation.z = -0.35 + i * 0.12;
        envGroup.add(ray);
      }

      // bolhas
      const bubbleCanvas = document.createElement("canvas");
      bubbleCanvas.width = bubbleCanvas.height = 64;
      {
        const ctx = bubbleCanvas.getContext("2d")!;
        ctx.strokeStyle = "rgba(235,248,244,0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(32, 32, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(235,248,244,0.5)";
        ctx.beginPath();
        ctx.arc(24, 24, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      const bubbleTexture = keep(toTexture(bubbleCanvas));
      const bubbles: THREE.Sprite[] = [];
      for (let i = 0; i < (isMobile ? 16 : 28); i++) {
        const sprite = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: bubbleTexture, transparent: true, opacity: 0.5, depthWrite: false })));
        const size = 0.05 + Math.random() * 0.12;
        sprite.scale.set(size, size, 1);
        sprite.position.set((Math.random() - 0.5) * 10, -2 + Math.random() * 6, -2 - Math.random() * 14);
        sprite.userData.speed = 0.2 + Math.random() * 0.4;
        envGroup.add(sprite);
        bubbles.push(sprite);
      }

      // superfície da água, vista de baixo — ondula e cintila
      const surface = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(50, 40, 48, 32)),
        keep(new THREE.MeshStandardMaterial({
          color: 0x9fd4cf,
          transparent: true,
          opacity: 0.35,
          roughness: 0.15,
          metalness: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false
        }))
      );
      surface.rotation.x = Math.PI / 2;
      surface.position.set(0, 5.2, -8);
      envGroup.add(surface);
      const surfaceAttr = surface.geometry.getAttribute("position") as THREE.BufferAttribute;

      // cáusticas a dançar no fundo
      const causticCanvas = document.createElement("canvas");
      causticCanvas.width = causticCanvas.height = 256;
      {
        const ctx = causticCanvas.getContext("2d")!;
        ctx.strokeStyle = "rgba(235,250,240,0.5)";
        ctx.lineWidth = 3;
        for (let i = 0; i < 26; i++) {
          ctx.beginPath();
          ctx.ellipse(Math.random() * 256, Math.random() * 256, 20 + Math.random() * 34, 12 + Math.random() * 18, Math.random() * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      const causticTexture = keep(toTexture(causticCanvas));
      causticTexture.wrapS = causticTexture.wrapT = THREE.RepeatWrapping;
      causticTexture.repeat.set(4, 4);
      const caustics = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(60, 60)),
        keep(new THREE.MeshBasicMaterial({ map: causticTexture, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }))
      );
      caustics.rotation.x = -Math.PI / 2;
      caustics.position.set(0, -1.88, -10);
      envGroup.add(caustics);

      // cardume de peixes de papel
      const fishCanvas = document.createElement("canvas");
      fishCanvas.width = 128; fishCanvas.height = 64;
      {
        const ctx = fishCanvas.getContext("2d")!;
        ctx.fillStyle = "#e8dfc8";
        ctx.beginPath();
        ctx.moveTo(10, 32);
        ctx.quadraticCurveTo(52, 4, 96, 30);
        ctx.quadraticCurveTo(112, 18, 122, 12);
        ctx.quadraticCurveTo(116, 32, 122, 52);
        ctx.quadraticCurveTo(112, 46, 96, 34);
        ctx.quadraticCurveTo(52, 60, 10, 32);
        ctx.fill();
        ctx.fillStyle = "#16414a";
        ctx.beginPath();
        ctx.arc(26, 28, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const fishTexture = keep(toTexture(fishCanvas));
      const school: THREE.Mesh[] = [];
      for (let i = 0; i < (isMobile ? 4 : 7); i++) {
        const fish = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(0.6, 0.3)),
          keep(new THREE.MeshBasicMaterial({ map: fishTexture, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }))
        );
        fish.position.set(-6 - Math.random() * 4, -0.4 + Math.random() * 2.6, -3 - Math.random() * 11);
        fish.userData.speed = 0.012 + Math.random() * 0.012;
        fish.userData.phase = Math.random() * 6;
        envGroup.add(fish);
        school.push(fish);
      }

      // neve marinha
      const snowGeometry = keep(new THREE.BufferGeometry());
      const snowCount = isMobile ? 120 : 220;
      const snowPositions = new Float32Array(snowCount * 3);
      for (let i = 0; i < snowCount; i++) {
        snowPositions[i * 3] = (Math.random() - 0.5) * 16;
        snowPositions[i * 3 + 1] = -2 + Math.random() * 8;
        snowPositions[i * 3 + 2] = -1 - Math.random() * 16;
      }
      snowGeometry.setAttribute("position", new THREE.BufferAttribute(snowPositions, 3));
      const snow = new THREE.Points(
        snowGeometry,
        keep(new THREE.PointsMaterial({ color: 0xdff0e8, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false }))
      );
      envGroup.add(snow);

      // ---------- a estrela-do-mar (a protagonista) ----------
      const starGeometry = keep(new THREE.ExtrudeGeometry(starShape(5, 0.52, 0.22, 0.5), { depth: 0.09, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }));
      {
        const attr = starGeometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < attr.count; i++) {
          attr.setZ(i, attr.getZ(i) + Math.sin(attr.getX(i) * 14) * Math.cos(attr.getY(i) * 14) * 0.012);
        }
        starGeometry.computeVertexNormals();
      }
      const starfish = new THREE.Mesh(
        starGeometry,
        keep(new THREE.MeshStandardMaterial({ color: 0xc9873f, metalness: 0.25, roughness: 0.6, emissive: 0x2a1804, emissiveIntensity: 0.35 }))
      );
      scene.add(starfish);
      const starLight = new THREE.PointLight(0xffd9a0, 0.7, 6);
      scene.add(starLight);

      // percurso da estrela e da câmara
      const starPath = [
        new THREE.Vector3(0, 0.15, 1.2), // centro: onde a joia acorda
        new THREE.Vector3(0.4, 0.6, -2.5),
        new THREE.Vector3(-1.2, -0.2, -6.5),
        new THREE.Vector3(0.8, -0.9, -10.5),
        new THREE.Vector3(-0.4, -1.9, -14.5)
      ];
      const currentStar = new THREE.Vector3();
      const currentCamera = new THREE.Vector3();

      const clock = new THREE.Clock();
      let raf = 0;
      const renderLoop = () => {
        const t = clock.getElapsedTime();
        const progress = reduced ? 0.5 : progressRef.current;
        const intro = smooth(Math.min(progress / INTRO, 1));
        const journey = Math.max(0, (progress - INTRO) / (1 - INTRO));
        envGroup.visible = progress > INTRO * 0.9;
        scene.fog = envGroup.visible ? new THREE.Fog(0x16414a, 6, 34) : null;

        const scaled = Math.min(journey / 0.94, 1) * (starPath.length - 1);
        const index = Math.min(Math.floor(scaled), starPath.length - 2);
        const local = smooth(scaled - index);
        currentStar.lerpVectors(starPath[index], starPath[index + 1], local);
        currentStar.y += Math.sin(t * 0.9) * 0.08 * intro;
        currentStar.x += Math.sin(t * 0.5) * 0.06 * intro;
        starfish.position.copy(currentStar);
        // na revelação: cresce e roda devagar sobre a fotografia
        const bodyScale = 0.3 + intro * 0.7;
        starfish.scale.setScalar(bodyScale);
        starfish.rotation.set(t * 0.22, t * 0.16, intro * 1.2 + t * 0.3);
        starLight.position.copy(currentStar).add(new THREE.Vector3(0.4, 0.6, 0.8));

        if (journey <= 0) {
          camera.position.lerp(new THREE.Vector3(0, 0.18, 4.4), 0.12);
          camera.lookAt(currentStar);
        } else {
          currentCamera.copy(currentStar).add(new THREE.Vector3(0.7, 0.42, 2.5));
          camera.position.lerp(currentCamera, 0.08);
          camera.lookAt(currentStar);
        }

        for (const sway of swayers) {
          sway.mesh.rotation[sway.axis || "z"] = Math.sin(t * sway.speed + sway.phase) * sway.amp;
        }
        for (const bubble of bubbles) {
          bubble.position.y += bubble.userData.speed * 0.008;
          if (bubble.position.y > 4.5) bubble.position.y = -2.2;
        }
        // água a ondular; cáusticas a deslizar; cardume; neve
        for (let i = 0; i < surfaceAttr.count; i++) {
          const x = surfaceAttr.getX(i);
          const y = surfaceAttr.getY(i);
          surfaceAttr.setZ(i, Math.sin(x * 0.7 + t * 1.1) * 0.16 + Math.cos(y * 0.5 + t * 0.8) * 0.12);
        }
        surfaceAttr.needsUpdate = true;
        causticTexture.offset.x = t * 0.015;
        causticTexture.offset.y = Math.sin(t * 0.3) * 0.02;
        for (const fish of school) {
          fish.position.x += fish.userData.speed;
          fish.position.y += Math.sin(t * 1.4 + fish.userData.phase) * 0.003;
          if (fish.position.x > 7) fish.position.x = -8;
        }
        const snowAttr = snow.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < snowAttr.count; i++) {
          snowAttr.setY(i, snowAttr.getY(i) - 0.004);
          if (snowAttr.getY(i) < -2.3) snowAttr.setY(i, 6);
        }
        snowAttr.needsUpdate = true;
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
    }

    // =================== O SOL ===================
    scene.add(new THREE.HemisphereLight(0xfff3da, 0x9c8a6a, 1));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2, 3, 4);
    scene.add(key);

    // o sol: disco + raios (a forma do pendente)
    const sunGroup = new THREE.Group();
    const rays = new THREE.Mesh(
      keep(new THREE.ExtrudeGeometry(starShape(14, 1.5, 0.72, 0.15), { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 })),
      keep(new THREE.MeshStandardMaterial({ color: 0xc9a24b, metalness: 0.85, roughness: 0.3 }))
    );
    const face = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.74, 0.74, 0.16, 48)),
      keep(new THREE.MeshStandardMaterial({ color: 0xd8b464, metalness: 0.8, roughness: 0.35 }))
    );
    face.rotation.x = Math.PI / 2;
    face.position.z = 0.06;
    {
      // martelado do pendente
      const attr = (rays.geometry.getAttribute("position") as THREE.BufferAttribute);
      for (let i = 0; i < attr.count; i++) {
        attr.setZ(i, attr.getZ(i) + Math.sin(attr.getX(i) * 22) * Math.cos(attr.getY(i) * 22) * 0.01);
      }
      rays.geometry.computeVertexNormals();
    }
    sunGroup.add(rays);
    sunGroup.add(face);
    scene.add(sunGroup);

    // halo
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = haloCanvas.height = 256;
    {
      const ctx = haloCanvas.getContext("2d")!;
      const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      gradient.addColorStop(0, "rgba(255,236,190,0.9)");
      gradient.addColorStop(0.5, "rgba(255,220,160,0.25)");
      gradient.addColorStop(1, "rgba(255,220,160,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    }
    const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(toTexture(haloCanvas)), transparent: true, depthWrite: false })));
    halo.scale.set(7, 7, 1);
    sunGroup.add(halo);

    // nuvens de papel
    function cloudCanvas() {
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#f6f1e2";
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.ellipse(90 + i * 55, 150 - Math.sin(i * 1.4) * 30, 60 + Math.random() * 30, 38 + Math.random() * 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return canvas;
    }
    const clouds: THREE.Mesh[] = [];
    for (let i = 0; i < (isMobile ? 3 : 5); i++) {
      const cloud = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(3.4 + i * 0.6, 1.6)),
        keep(new THREE.MeshBasicMaterial({ map: keep(toTexture(cloudCanvas())), transparent: true, opacity: 0.9, depthWrite: false }))
      );
      cloud.position.set(-7 + i * 3.4, 0.4 + (i % 3) * 1.3, -6 - (i % 2) * 3);
      envGroup.add(cloud);
      clouds.push(cloud);
    }

    // o mar ao fundo
    const seaCanvas = document.createElement("canvas");
    seaCanvas.width = 512; seaCanvas.height = 128;
    {
      const ctx = seaCanvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 128);
      gradient.addColorStop(0, "#9db8b4");
      gradient.addColorStop(1, "#5f8486");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = "rgba(255,236,190,0.5)";
      for (let i = 0; i < 60; i++) {
        ctx.fillRect(200 + Math.random() * 110, Math.random() * 128, 10 + Math.random() * 26, 2);
      }
    }
    const sea = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(60, 22, 60, 24)),
      keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(seaCanvas)), roughness: 0.25, metalness: 0.55 }))
    );
    sea.rotation.x = -Math.PI / 2.25;
    sea.position.set(0, -3.4, -14);
    envGroup.add(sea);
    const seaAttr = sea.geometry.getAttribute("position") as THREE.BufferAttribute;

    // o reflexo do sol na água
    const streakCanvas = document.createElement("canvas");
    streakCanvas.width = 64; streakCanvas.height = 256;
    {
      const ctx = streakCanvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, "rgba(255,224,160,0.85)");
      gradient.addColorStop(1, "rgba(255,224,160,0)");
      ctx.fillStyle = gradient;
      for (let y = 0; y < 256; y += 8) {
        const width = 8 + (y / 256) * 44 + Math.random() * 8;
        ctx.fillRect(32 - width / 2, y, width, 5);
      }
    }
    const streak = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(2.6, 9)),
      keep(new THREE.MeshBasicMaterial({ map: keep(toTexture(streakCanvas)), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
    );
    streak.rotation.x = -Math.PI / 2.25;
    streak.position.set(0, -3.3, -11);
    envGroup.add(streak);

    // pássaros ao longe
    const birdCanvas = document.createElement("canvas");
    birdCanvas.width = 128; birdCanvas.height = 64;
    {
      const ctx = birdCanvas.getContext("2d")!;
      ctx.strokeStyle = "rgba(60,55,45,0.8)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(14, 40);
      ctx.quadraticCurveTo(40, 14, 64, 38);
      ctx.quadraticCurveTo(88, 14, 114, 40);
      ctx.stroke();
    }
    const birdTexture = keep(toTexture(birdCanvas));
    const birds: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const bird = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(0.5, 0.25)),
        keep(new THREE.MeshBasicMaterial({ map: birdTexture, transparent: true, depthWrite: false }))
      );
      bird.position.set(-6 - i * 2, 1.6 + i * 0.7, -9 - i * 2);
      bird.userData.speed = 0.008 + i * 0.004;
      envGroup.add(bird);
      birds.push(bird);
    }

    const skyDawn = new THREE.Color(0xf3ddbb);
    const skyNoon = new THREE.Color(0xeef2ea);
    const skyDusk = new THREE.Color(0xe6b98f);
    const skyColor = new THREE.Color();

    const clock = new THREE.Clock();
    let raf = 0;
    const renderLoop = () => {
      const t = clock.getElapsedTime();
      const progress = reduced ? 0.5 : progressRef.current;
      const intro = smooth(Math.min(progress / INTRO, 1));
      const journey = Math.max(0, (progress - INTRO) / (1 - INTRO));
      envGroup.visible = progress > INTRO * 0.9;

      // o dia passa: nascente → meio-dia → poente
      const day = smooth(Math.min(journey / 0.92, 1));
      const arc = Math.sin(day * Math.PI);
      if (journey <= 0) {
        // revelação: o pendente acorda no centro, sobre a fotografia
        sunGroup.position.set(0, 0, -0.5);
        camera.position.set(0, 0, 4.2);
        camera.lookAt(0, 0, -0.5);
      } else {
        sunGroup.position.set(0, -1.2 + arc * 3.1, -4);
        camera.position.set(0, 0.4, 3.7 + day * 1.3);
        camera.lookAt(0, sunGroup.position.y * 0.55, -4);
      }
      sunGroup.rotation.z = intro * 1.4 + t * 0.12;
      const pulse = (0.35 + intro * 0.65) * (1 + Math.sin(t * 1.4) * 0.015);
      sunGroup.scale.set(pulse, pulse, pulse);
      if (day < 0.5) skyColor.lerpColors(skyDawn, skyNoon, smooth(day * 2));
      else skyColor.lerpColors(skyNoon, skyDusk, smooth((day - 0.5) * 2));
      if (envGroup.visible) renderer.setClearColor(skyColor, 1);
      else renderer.setClearColor(0x000000, 0);
      for (let i = 0; i < clouds.length; i++) {
        clouds[i].position.x += 0.0015 * (1 + (i % 3));
        if (clouds[i].position.x > 9) clouds[i].position.x = -9;
      }
      for (let i = 0; i < seaAttr.count; i++) {
        const x = seaAttr.getX(i);
        const y = seaAttr.getY(i);
        seaAttr.setZ(i, Math.sin(x * 0.5 + t * 1.2) * 0.1 + Math.cos(y * 0.7 + t * 0.9) * 0.08);
      }
      seaAttr.needsUpdate = true;
      streak.material.opacity = 0.35 + arc * 0.5;
      streak.scale.y = 0.7 + arc * 0.5;
      for (const bird of birds) {
        bird.position.x += bird.userData.speed;
        if (bird.position.x > 8) bird.position.x = -9;
      }
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
