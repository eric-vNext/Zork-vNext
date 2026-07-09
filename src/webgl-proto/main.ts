import './style.css';
import {
  createFullscreenTriangle, createGL2, createProgram, createRenderTarget, resizeRenderTarget,
  type RenderTarget,
} from './gl';
import {
  blurFrag, brightPassFrag, compositeFrag, fireFrag, fullscreenVert,
  particleFrag, particleVert, waterFrag,
} from './shaders';
import { createParticleSystem, drawParticles, type ParticleSystem } from './particles';

const statusEl = document.getElementById('status')!;
const fpsEl = document.getElementById('fps')!;
const canvas = document.getElementById('gl') as HTMLCanvasElement;

let gl: WebGL2RenderingContext;
try {
  gl = createGL2(canvas);
} catch (err) {
  statusEl.textContent = `WebGL2 isn't available here: ${(err as Error).message}`;
  statusEl.hidden = false;
  throw err;
}

try {
  boot(gl);
} catch (err) {
  console.error(err);
  statusEl.textContent = `Shader setup failed: ${(err as Error).message}`;
  statusEl.hidden = false;
}

function boot(gl: WebGL2RenderingContext) {
  const quad = createFullscreenTriangle(gl);
  const fireProgram = createProgram(gl, fullscreenVert, fireFrag);
  const waterProgram = createProgram(gl, fullscreenVert, waterFrag);
  const brightProgram = createProgram(gl, fullscreenVert, brightPassFrag);
  const blurProgram = createProgram(gl, fullscreenVert, blurFrag);
  const compositeProgram = createProgram(gl, fullscreenVert, compositeFrag);
  const particleProgram = createProgram(gl, particleVert, particleFrag);

  const PARTICLE_COUNT = 4000;
  const particles: ParticleSystem = createParticleSystem(gl, PARTICLE_COUNT);

  let scene: RenderTarget = createRenderTarget(gl, 2, 2);
  let bloomA: RenderTarget = createRenderTarget(gl, 2, 2);
  let bloomB: RenderTarget = createRenderTarget(gl, 2, 2);

  let mode: 'fire' | 'water' = 'fire';
  const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode as 'fire' | 'water';
      modeButtons.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const newW = Math.max(1, Math.round(rect.width * dpr));
    const newH = Math.max(1, Math.round(rect.height * dpr));
    if (newW === w && newH === h) return;
    w = newW;
    h = newH;
    canvas.width = w;
    canvas.height = h;
    resizeRenderTarget(gl, scene, w, h);
    resizeRenderTarget(gl, bloomA, Math.ceil(w / 2), Math.ceil(h / 2));
    resizeRenderTarget(gl, bloomB, Math.ceil(w / 2), Math.ceil(h / 2));
  }
  resize();
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

  function drawFullscreen(program: WebGLProgram, bind: (loc: (name: string) => WebGLUniformLocation | null) => void) {
    gl.useProgram(program);
    bind((name) => gl.getUniformLocation(program, name));
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  let frames = 0;
  let fpsWindowStart = performance.now();
  const start = performance.now();

  function frame(now: number) {
    resize();
    const t = (now - start) / 1000;

    // --- 1. render the hero scene (fire or water) into an offscreen target
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer);
    gl.viewport(0, 0, scene.width, scene.height);
    gl.disable(gl.BLEND);
    const sceneProgram = mode === 'fire' ? fireProgram : waterProgram;
    drawFullscreen(sceneProgram, (u) => {
      gl.uniform2f(u('uResolution'), scene.width, scene.height);
      gl.uniform1f(u('uTime'), t);
    });

    // --- 2. GPU-instanced particles, additively blended straight into the scene target
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(particleProgram);
    gl.uniform1f(gl.getUniformLocation(particleProgram, 'uTime'), t);
    gl.uniform1f(gl.getUniformLocation(particleProgram, 'uAspect'), scene.width / scene.height);
    gl.uniform1f(gl.getUniformLocation(particleProgram, 'uMode'), mode === 'fire' ? 0 : 1);
    drawParticles(gl, particles);
    gl.disable(gl.BLEND);

    // --- 3. bright-pass extract (half-res)
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomA.framebuffer);
    gl.viewport(0, 0, bloomA.width, bloomA.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    drawFullscreen(brightProgram, (u) => {
      gl.uniform1i(u('uScene'), 0);
      gl.uniform2f(u('uTexelSize'), 1 / bloomA.width, 1 / bloomA.height);
      gl.uniform1f(u('uThreshold'), 0.55);
    });

    // --- 4. separable Gaussian blur, ping-ponging a few passes for a soft glow
    const PASSES = 3;
    let src = bloomA;
    let dst = bloomB;
    for (let i = 0; i < PASSES * 2; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.framebuffer);
      gl.viewport(0, 0, dst.width, dst.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.texture);
      const horizontal = i % 2 === 0;
      drawFullscreen(blurProgram, (u) => {
        gl.uniform1i(u('uSrc'), 0);
        gl.uniform2f(u('uTexelSize'), 1 / src.width, 1 / src.height);
        gl.uniform2f(u('uDirection'), horizontal ? 1 : 0, horizontal ? 0 : 1);
      });
      [src, dst] = [dst, src];
    }

    // --- 5. composite scene + bloom to the visible canvas, with a light tonemap
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    drawFullscreen(compositeProgram, (u) => {
      gl.uniform1i(u('uScene'), 0);
      gl.uniform1i(u('uBloom'), 1);
      gl.uniform2f(u('uTexelSize'), 1 / w, 1 / h);
      gl.uniform1f(u('uBloomStrength'), 1.15);
    });

    frames++;
    if (now - fpsWindowStart > 500) {
      const fps = Math.round((frames * 1000) / (now - fpsWindowStart));
      fpsEl.textContent = `${fps} fps · ${PARTICLE_COUNT.toLocaleString()} GPU particles · ${w}×${h}`;
      frames = 0;
      fpsWindowStart = now;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
