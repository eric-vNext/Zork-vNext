// GPU-instanced particles: one small quad, thousands of instances, all
// motion computed in the vertex shader from a per-instance seed + uTime.
// No JS-side simulation loop — this is the "order of magnitude more
// particles" half of the P3 pitch.

export interface ParticleSystem {
  vao: WebGLVertexArrayObject;
  count: number;
}

export function createParticleSystem(gl: WebGL2RenderingContext, count: number): ParticleSystem {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('createVertexArray failed');
  gl.bindVertexArray(vao);

  // a unit quad, two triangles, corners in -0.5..0.5
  const corners = new Float32Array([
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  ]);
  const cornerBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
  gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // one stable random seed per instance
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = Math.random() * 1000;
  const seedBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(1, 1);

  gl.bindVertexArray(null);
  return { vao, count };
}

export function drawParticles(gl: WebGL2RenderingContext, ps: ParticleSystem) {
  gl.bindVertexArray(ps.vao);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, ps.count);
  gl.bindVertexArray(null);
}
