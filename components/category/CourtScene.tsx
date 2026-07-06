"use client";

// WOMEN → SPORTS: cenário completo de court de clube ao fim de tarde.
// Não são objetos a flutuar — é um set: chão de court (verde + terracota com
// linhas brancas), rede verdadeira com fita branca, raquetes de madeira como
// esculturas, tecido plissado pousado na rede, sebe escura ao fundo com
// bokeh quente, SOMBRAS REAIS (shadow map), neblina de profundidade e
// câmara viva (deriva lenta + rato + scroll). Sem bolas, sem blobs.

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ---------- texturas pintadas (nenhuma imagem externa: zero egress) ----------

function courtTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // terracota envolvente
  ctx.fillStyle = "#8e5643";
  ctx.fillRect(0, 0, 1024, 1024);

  // court verde
  ctx.fillStyle = "#5c7561";
  ctx.fillRect(112, 40, 800, 944);

  // linhas brancas
  ctx.strokeStyle = "rgba(245,242,232,0.92)";
  ctx.lineWidth = 7;
  ctx.strokeRect(152, 90, 720, 844);
  ctx.beginPath();
  ctx.moveTo(152, 512);
  ctx.lineTo(872, 512);
  ctx.moveTo(512, 90);
  ctx.lineTo(512, 934);
  ctx.stroke();

  // grão do piso
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctx.fillStyle = `rgba(${20 + Math.random() * 30},${18 + Math.random() * 24},${14 + Math.random() * 18},${Math.random() * 0.08})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function netTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 256);

  // malha em losango
  ctx.strokeStyle = "rgba(22,20,18,0.95)";
  ctx.lineWidth = 2.6;
  const step = 18;
  for (let x = -256; x < 768; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 256, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 256, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  // fita branca no topo
  ctx.fillStyle = "rgba(242,238,228,0.98)";
  ctx.fillRect(0, 0, 512, 26);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  return texture;
}

function stringsTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(246,243,235,0.95)";
  ctx.lineWidth = 3;
  for (let i = 12; i < 256; i += 17) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function hedgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#141f15";
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 2 + Math.random() * 7;
    ctx.fillStyle = `rgba(${16 + Math.random() * 26},${30 + Math.random() * 34},${16 + Math.random() * 22},${0.12 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export default function CourtScene() {
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x15201a, 13, 42);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    const baseCamera = new THREE.Vector3(isMobile ? 0 : -0.6, 1.5, 9.8);
    camera.position.copy(baseCamera);

    // luz de fim de tarde com sombras reais
    scene.add(new THREE.HemisphereLight(0xffe9c8, 0x1a2418, 0.75));
    const sun = new THREE.DirectionalLight(0xffdCA8, 2.4);
    sun.position.set(-7, 9, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -6;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const warm = new THREE.PointLight(0xffd9a0, 26, 30, 2);
    warm.position.set(4, 3, 5);
    scene.add(warm);

    const disposables: Array<{ dispose: () => void }> = [];
    function keep<T extends { dispose: () => void }>(item: T): T {
      disposables.push(item);
      return item;
    }

    // ---------- chão: court verde + terracota ----------
    const ground = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(46, 46)),
      keep(new THREE.MeshStandardMaterial({ map: keep(courtTexture()), roughness: 0.94 }))
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -2, -8);
    ground.receiveShadow = true;
    scene.add(ground);

    // ---------- sebe escura ao fundo + bokeh quente ----------
    const hedge = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(70, 15)),
      keep(new THREE.MeshStandardMaterial({ map: keep(hedgeTexture()), roughness: 1 }))
    );
    hedge.position.set(0, 3.4, -26);
    scene.add(hedge);

    const glow = keep(glowTexture());
    const bokeh: THREE.Sprite[] = [];
    const bokehSpots: Array<[number, number, number, number, number]> = [
      [-6, 3.4, -22, 4.5, 0.22],
      [3, 4.6, -21, 3.2, 0.18],
      [8, 2.6, -23, 5, 0.16]
    ];
    bokehSpots.forEach(([x, y, z, size, opacity]) => {
      const sprite = new THREE.Sprite(
        keep(new THREE.SpriteMaterial({
          map: glow,
          color: 0xffdCA8,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }))
      );
      sprite.position.set(x, y, z);
      sprite.scale.setScalar(size);
      scene.add(sprite);
      bokeh.push(sprite);
    });

    // ---------- rede: postes, fita e malha ----------
    const netGroup = new THREE.Group();
    const netWidth = 16;

    const postMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x20211d, roughness: 0.5, metalness: 0.4 }));
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.06, 0.07, 2.3, 12)), postMaterial);
      post.position.set((side * netWidth) / 2, -0.85, 0);
      post.castShadow = true;
      netGroup.add(post);
    }

    const net = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(netWidth, 1.9, 64, 10)),
      keep(new THREE.MeshStandardMaterial({
        map: keep(netTexture()),
        transparent: true,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
        roughness: 0.9
      }))
    );
    net.position.set(0, -0.75, 0);
    net.castShadow = true;
    net.receiveShadow = true;
    netGroup.add(net);
    netGroup.position.set(0, 0, -3.4);
    scene.add(netGroup);

    // ---------- raquete de madeira (escultura) ----------
    const strings = keep(stringsTexture());
    function buildRacket(frameColor: number, gripColor: number) {
      const racket = new THREE.Group();
      const frameMaterial = keep(new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.45, metalness: 0.05 }));

      const head = new THREE.Mesh(keep(new THREE.TorusGeometry(0.62, 0.055, 20, 72)), frameMaterial);
      head.scale.set(1, 1.24, 1);
      head.castShadow = true;
      racket.add(head);

      const stringPlane = new THREE.Mesh(
        keep(new THREE.CircleGeometry(0.58, 40)),
        keep(new THREE.MeshStandardMaterial({
          map: strings,
          transparent: true,
          alphaTest: 0.3,
          side: THREE.DoubleSide,
          roughness: 0.8
        }))
      );
      stringPlane.scale.set(1, 1.24, 1);
      stringPlane.castShadow = true;
      racket.add(stringPlane);

      // garganta em V
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.045, 0.05, 0.66, 10)), frameMaterial);
        arm.position.set(side * 0.16, -0.98, 0);
        arm.rotation.z = side * 0.24;
        arm.castShadow = true;
        racket.add(arm);
      }

      const handle = new THREE.Mesh(
        keep(new THREE.CylinderGeometry(0.055, 0.06, 1.15, 12)),
        keep(new THREE.MeshStandardMaterial({ color: gripColor, roughness: 0.7 }))
      );
      handle.position.y = -1.82;
      handle.castShadow = true;
      racket.add(handle);

      return racket;
    }

    // raquete principal: encostada à rede, ligeiramente inclinada
    const heroRacket = buildRacket(0xefe9dd, 0x7a4d2e);
    heroRacket.scale.setScalar(isMobile ? 1 : 1.18);
    heroRacket.position.set(isMobile ? 1.15 : 2.9, isMobile ? 0.6 : 0.85, -2.7);
    heroRacket.rotation.set(0.08, -0.5, -0.16);
    scene.add(heroRacket);

    // segunda raquete: pousada no chão, ao longe
    const restingRacket = buildRacket(0xe4dccb, 0x6b4226);
    restingRacket.scale.setScalar(0.9);
    restingRacket.position.set(isMobile ? -2 : -4.6, -1.93, -5.5);
    restingRacket.rotation.set(-Math.PI / 2 + 0.06, 0, 0.7);
    scene.add(restingRacket);

    // ---------- tecido plissado pousado na fita da rede ----------
    const drape = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(2.1, 1.7, 46, 22)),
      keep(new THREE.MeshStandardMaterial({
        color: 0xefe6d2,
        roughness: 0.75,
        side: THREE.DoubleSide
      }))
    );
    const drapeAttr = drape.geometry.getAttribute("position") as THREE.BufferAttribute;
    const drapeBase: number[] = [];
    for (let i = 0; i < drapeAttr.count; i++) {
      const x = drapeAttr.getX(i);
      const y = drapeAttr.getY(i);
      // dobra sobre a fita: acima da dobra cai para trás, abaixo para a frente
      const fold = y > 0.55 ? (y - 0.55) * -1.4 : 0;
      const pleat = Math.sin(x * 14) * 0.035 * (1 - Math.max(0, y - 0.4));
      drapeAttr.setZ(i, fold + pleat);
      drapeBase.push(drapeAttr.getZ(i));
    }
    drape.geometry.computeVertexNormals();
    drape.position.set(isMobile ? -1.3 : -2.6, 0.12, -3.36);
    drape.castShadow = true;
    scene.add(drape);

    // ---------- pó de fim de tarde, muito discreto ----------
    const dustCount = isMobile ? 50 : 90;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 20;
      dustPositions[i * 3 + 1] = Math.random() * 6 - 1;
      dustPositions[i * 3 + 2] = -Math.random() * 12;
    }
    const dustGeometry = keep(new THREE.BufferGeometry());
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      keep(new THREE.PointsMaterial({
        map: glow,
        color: 0xffe6bb,
        size: 0.07,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }))
    );
    scene.add(dust);

    // ---------- interação ----------
    const pointer = { x: 0, y: 0 };
    let scrollY = 0;
    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
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
    const observer = new IntersectionObserver(
      (entries) => {
        heroVisible = entries[0]?.isIntersecting !== false;
        updateRunning();
      },
      { threshold: 0.02 }
    );
    observer.observe(mount);

    const netAttr = net.geometry.getAttribute("position") as THREE.BufferAttribute;

    function loop() {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();

      // brisa: rede e tecido respiram
      for (let i = 0; i < netAttr.count; i++) {
        const x = netAttr.getX(i);
        const y = netAttr.getY(i);
        netAttr.setZ(i, Math.sin(x * 0.9 + t * 0.8) * 0.03 * (1 - Math.abs(y) / 1.2));
      }
      netAttr.needsUpdate = true;

      for (let i = 0; i < drapeAttr.count; i++) {
        const x = drapeAttr.getX(i);
        drapeAttr.setZ(i, drapeBase[i] + Math.sin(x * 6 + t * 1.1) * 0.012);
      }
      drapeAttr.needsUpdate = true;
      drape.geometry.computeVertexNormals();

      // a raquete-escultura roda impercetivelmente
      heroRacket.rotation.y = -0.5 + Math.sin(t * 0.18) * 0.07;
      heroRacket.position.y += Math.sin(t * 0.6) * 0.0008;

      bokeh.forEach((sprite, index) => {
        sprite.material.opacity = 0.14 + Math.sin(t * 0.5 + index * 2.1) * 0.05;
      });

      dust.rotation.y = t * 0.008;

      // câmara viva: deriva lenta + rato + mergulho subtil com o scroll
      const drift = Math.sin(t * 0.06) * 0.35;
      const depth = Math.min(scrollY / window.innerHeight, 1.4);
      camera.position.x += (baseCamera.x + drift + pointer.x * 0.8 - camera.position.x) * 0.03;
      camera.position.y += (baseCamera.y - pointer.y * 0.4 - depth * 0.5 - camera.position.y) * 0.03;
      camera.position.z = baseCamera.z + Math.sin(t * 0.045) * 0.3 - depth * 1.6;
      camera.lookAt(isMobile ? 0 : 0.5, 0.15, -3.2);

      // a luz quente acompanha o rato
      warm.position.x += (pointer.x * 6 - warm.position.x) * 0.04;
      warm.position.y += (-pointer.y * 3 + 3 - warm.position.y) * 0.04;

      renderer.render(scene, camera);
    }
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="lgc-scene" aria-hidden="true" />;
}
