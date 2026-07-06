"use client";

// Cena do herói das categorias — estilo "site 3D cinematográfico":
// um objeto elegante do universo da marca flutua À FRENTE do título gigante
// (o canvas fica por cima das letras, criando o entrelaçado das referências).
//
// Cenários por tema:
// • sail   — veleiro estilizado com velas creme, a balançar num mar escuro
// • golf   — bandeira de golfe a ondular, bola branca, green ao entardecer
// • rings  — anéis de ouro em rotação de ourivesaria
// • silk   — sedas em movimento lento
// • seal   — o círculo de latão do selo da marca
//
// Performance: DPR limitado, contagens por dispositivo, pausa com o separador
// oculto, dispose completo, desativado com prefers-reduced-motion.

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type HeroThemeKey = "sail" | "golf" | "rings" | "silk" | "seal";

export default function HeroScene({ themeKey }: { themeKey: HeroThemeKey }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const isMobile = width < 720;
    const scale = isMobile ? 0.66 : 1;

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 80);
    camera.position.set(0, 0.3, 9);

    // luz de fim de tarde: âmbar quente + recorte frio suave
    scene.add(new THREE.AmbientLight(0x8a7a64, 0.7));
    const key = new THREE.DirectionalLight(0xffe2b0, 2.6);
    key.position.set(-5, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd2de, 1.1);
    rim.position.set(6, 2, -4);
    scene.add(rim);
    const warm = new THREE.PointLight(0xffd9a0, 22, 26, 2);
    warm.position.set(2, 2, 4);
    scene.add(warm);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = (item: any) => {
      disposables.push(item);
      return item;
    };

    // grupo principal — balança/roda como um todo
    const hero = new THREE.Group();
    scene.add(hero);

    const flags: THREE.Mesh[] = [];   // superfícies que ondulam (velas, bandeira, sedas)
    let sea: THREE.Mesh | null = null;
    let motion: "rock" | "spin" | "drift" = "drift";

    const cream = () =>
      track(new THREE.MeshStandardMaterial({
        color: 0xefe6d3,
        roughness: 0.8,
        metalness: 0,
        side: THREE.DoubleSide
      }));

    function addSea(color: number, opacity: number) {
      const geometry = track(new THREE.PlaneGeometry(40, 22, 80, 44));
      const material = track(new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.35,
        transparent: true,
        opacity,
        side: THREE.DoubleSide
      }));
      sea = new THREE.Mesh(geometry, material);
      sea.rotation.x = -Math.PI / 2 + 0.08;
      sea.position.set(0, -2.5, -4);
      scene.add(sea);
    }

    // -------------------- VELEIRO --------------------
    if (themeKey === "sail") {
      motion = "rock";

      // casco: esfera achatada e alongada (leitura imediata de casco)
      const hullGeometry = track(new THREE.SphereGeometry(1.9 * scale, 40, 24));
      const hullMaterial = track(new THREE.MeshStandardMaterial({
        color: 0x3a2e22, // madeira escura
        roughness: 0.5,
        metalness: 0.15
      }));
      const hull = new THREE.Mesh(hullGeometry, hullMaterial);
      hull.scale.set(1, 0.24, 0.34);
      hull.position.y = -0.9 * scale;
      hero.add(hull);

      // mastro
      const mastGeometry = track(new THREE.CylinderGeometry(0.035 * scale, 0.05 * scale, 4.4 * scale, 12));
      const mastMaterial = track(new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 0.6 }));
      const mast = new THREE.Mesh(mastGeometry, mastMaterial);
      mast.position.y = 1.3 * scale;
      hero.add(mast);

      // vela principal (triângulo curvo) + estai
      const mainShape = new THREE.Shape();
      mainShape.moveTo(0, 0);
      mainShape.lineTo(0, 3.6);
      mainShape.quadraticCurveTo(1.4, 1.6, 2.1, 0.15);
      mainShape.lineTo(0, 0);
      const mainGeometry = track(new THREE.ShapeGeometry(mainShape, 24));
      const mainSail = new THREE.Mesh(mainGeometry, cream());
      mainSail.scale.setScalar(scale);
      mainSail.position.set(0.05 * scale, -0.55 * scale, 0.02);
      hero.add(mainSail);
      flags.push(mainSail);

      const jibShape = new THREE.Shape();
      jibShape.moveTo(0, 0);
      jibShape.lineTo(0, 3);
      jibShape.quadraticCurveTo(-1.1, 1.3, -1.7, 0.1);
      jibShape.lineTo(0, 0);
      const jibGeometry = track(new THREE.ShapeGeometry(jibShape, 24));
      const jib = new THREE.Mesh(jibGeometry, cream());
      jib.scale.setScalar(scale);
      jib.position.set(-0.06 * scale, -0.55 * scale, -0.02);
      hero.add(jib);
      flags.push(jib);

      hero.position.set(isMobile ? 0 : 0.6, 0.5, 0);
      addSea(0x22354a, 0.85); // azul riviera
    }

    // -------------------- GOLFE --------------------
    if (themeKey === "golf") {
      motion = "drift";

      // green ao entardecer
      addSea(0x37452f, 0.9);

      // poste
      const poleGeometry = track(new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, 5 * scale, 12));
      const poleMaterial = track(new THREE.MeshStandardMaterial({ color: 0xefe6d3, roughness: 0.5 }));
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.y = 0;
      hero.add(pole);

      // bandeira (plano que ondula)
      const flagGeometry = track(new THREE.PlaneGeometry(1.7 * scale, 1 * scale, 28, 8));
      const flagMaterial = track(new THREE.MeshStandardMaterial({
        color: 0xa98e5f, // latão da marca
        roughness: 0.7,
        side: THREE.DoubleSide
      }));
      const flag = new THREE.Mesh(flagGeometry, flagMaterial);
      flag.position.set(0.88 * scale, 1.95 * scale, 0);
      hero.add(flag);
      flags.push(flag);

      // bola de golfe
      const ballGeometry = track(new THREE.SphereGeometry(0.34 * scale, 36, 24));
      const ballMaterial = track(new THREE.MeshStandardMaterial({ color: 0xf7f4ea, roughness: 0.55 }));
      const ball = new THREE.Mesh(ballGeometry, ballMaterial);
      ball.position.set(-1.7 * scale, -2.1 * scale, 1.4);
      hero.add(ball);

      hero.position.set(isMobile ? 0 : 0.9, 0.2, 0);
    }

    // -------------------- ANÉIS DE OURO --------------------
    if (themeKey === "rings") {
      motion = "spin";
      const gold = track(new THREE.MeshStandardMaterial({
        color: 0xc9a353,
        metalness: 0.95,
        roughness: 0.18
      }));

      const bigGeometry = track(new THREE.TorusGeometry(1.5 * scale, 0.17 * scale, 40, 120));
      const big = new THREE.Mesh(bigGeometry, gold);
      hero.add(big);

      const smallGeometry = track(new THREE.TorusGeometry(0.85 * scale, 0.11 * scale, 32, 90));
      const small = new THREE.Mesh(smallGeometry, gold);
      small.position.set(-1.9 * scale, -0.9 * scale, -1.4);
      small.rotation.set(0.9, 0.5, 0);
      hero.add(small);

      hero.position.set(isMobile ? 0 : 0.7, 0.5, 0);
    }

    // -------------------- SEDA --------------------
    if (themeKey === "silk") {
      motion = "drift";
      const silkA = new THREE.Mesh(
        track(new THREE.PlaneGeometry(20, 3.4, 90, 8)),
        track(new THREE.MeshStandardMaterial({
          color: 0xdcc7a6,
          roughness: 0.55,
          metalness: 0.05,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide
        }))
      );
      silkA.position.set(0, 0.6, -1);
      silkA.rotation.x = -0.45;
      hero.add(silkA);
      flags.push(silkA);

      const silkB = new THREE.Mesh(
        track(new THREE.PlaneGeometry(22, 2.6, 90, 6)),
        track(new THREE.MeshStandardMaterial({
          color: 0xb99972,
          roughness: 0.6,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        }))
      );
      silkB.position.set(0, -1.4, -3.5);
      silkB.rotation.x = -0.5;
      silkB.userData.offset = 2.2;
      hero.add(silkB);
      flags.push(silkB);
    }

    // -------------------- SELO --------------------
    if (themeKey === "seal") {
      motion = "spin";
      const brass = track(new THREE.MeshStandardMaterial({
        color: 0xa98e5f,
        metalness: 0.85,
        roughness: 0.28
      }));
      const outer = new THREE.Mesh(
        track(new THREE.TorusGeometry(1.7 * scale, 0.05 * scale, 24, 140)),
        brass
      );
      hero.add(outer);
      const inner = new THREE.Mesh(
        track(new THREE.TorusGeometry(1.15 * scale, 0.035 * scale, 24, 120)),
        brass
      );
      inner.rotation.x = 0.5;
      hero.add(inner);
      hero.position.set(isMobile ? 0 : 0.7, 0.4, 0);
    }

    // pó fino ao entardecer (só ambiente, poucas e discretas)
    {
      const count = isMobile ? 90 : 220;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 22;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
      }
      const dustGeometry = track(new THREE.BufferGeometry());
      dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const dustMaterial = track(new THREE.PointsMaterial({
        color: 0xe8d5ae,
        size: 0.06,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      }));
      scene.add(new THREE.Points(dustGeometry, dustMaterial));
    }

    // -------------------- interação e loop --------------------
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
    let running = true;
    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running) {
        clock.getDelta();
        loop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    function loop() {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();

      // movimento do objeto principal
      if (motion === "rock") {
        hero.rotation.z = Math.sin(t * 0.55) * 0.055;
        hero.rotation.x = Math.sin(t * 0.4 + 1) * 0.02;
        hero.position.y = 0.5 + Math.sin(t * 0.7) * 0.1;
      } else if (motion === "spin") {
        hero.rotation.y += 0.0035;
        hero.rotation.x = Math.sin(t * 0.3) * 0.18;
        hero.position.y += Math.sin(t * 0.5) * 0.0015;
      } else {
        hero.rotation.y = Math.sin(t * 0.2) * 0.08;
        hero.position.y += Math.sin(t * 0.5) * 0.001;
      }

      // superfícies a ondular (velas, bandeira, sedas)
      flags.forEach((surface) => {
        const geo = surface.geometry as THREE.BufferGeometry;
        const attr = geo.getAttribute("position") as THREE.BufferAttribute;
        const offset = (surface.userData.offset as number) || 0;
        for (let i = 0; i < attr.count; i++) {
          const x = attr.getX(i);
          const y = attr.getY(i);
          attr.setZ(i, Math.sin(x * 1.1 + t * 1.4 + offset) * 0.08 * (0.4 + Math.abs(x) * 0.4) + Math.sin(y * 0.8 + t * 0.9) * 0.04);
        }
        attr.needsUpdate = true;
        geo.computeVertexNormals();
      });

      // mar/green a ondular
      if (sea) {
        const geo = sea.geometry as THREE.PlaneGeometry;
        const attr = geo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < attr.count; i++) {
          const x = attr.getX(i);
          const y = attr.getY(i);
          attr.setZ(i, Math.sin(x * 0.45 + t * 0.5) * 0.14 + Math.cos(y * 0.35 + t * 0.35) * 0.1);
        }
        attr.needsUpdate = true;
        geo.computeVertexNormals();
      }

      // paralaxe de rato + mergulho suave com o scroll
      warm.position.x += (pointer.x * 5 - warm.position.x) * 0.03;
      warm.position.y += (-pointer.y * 3 + 2 - warm.position.y) * 0.03;
      camera.position.x += (pointer.x * 0.55 - camera.position.x) * 0.025;
      camera.position.y += (-pointer.y * 0.35 + 0.3 - camera.position.y) * 0.025;
      camera.position.z = 9 - Math.min(scrollY / window.innerHeight, 1) * 1.4;
      camera.lookAt(0, 0.1, 0);

      renderer.render(scene, camera);
    }
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
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
  }, [themeKey]);

  return <div ref={mountRef} className="lgh-canvas" aria-hidden="true" />;
}
