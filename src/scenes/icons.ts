// Canvas-drawn item icons, rendered at small size for the inventory strip.
// Each painter draws into a normalized 100x100 box; drawIcon scales.

type IconPainter = (c: CanvasRenderingContext2D) => void;

const painters: Record<string, IconPainter> = {
  lamp(c) {
    c.fillStyle = '#8a6a2e';
    c.fillRect(38, 14, 24, 8); // cap
    c.fillRect(44, 6, 12, 10); // ring
    const g = c.createLinearGradient(30, 0, 70, 0);
    g.addColorStop(0, '#7a5c22');
    g.addColorStop(0.5, '#e8c05e');
    g.addColorStop(1, '#6b4e1c');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(34, 22);
    c.lineTo(66, 22);
    c.quadraticCurveTo(74, 50, 66, 82);
    c.lineTo(34, 82);
    c.quadraticCurveTo(26, 50, 34, 22);
    c.closePath();
    c.fill();
    c.fillStyle = '#fff3c4'; // glass window
    c.beginPath();
    c.roundRect(41, 34, 18, 34, 5);
    c.fill();
    c.fillStyle = '#ffd98a';
    c.beginPath();
    c.ellipse(50, 56, 5, 9, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#8a6a2e';
    c.fillRect(32, 82, 36, 8);
  },
  sword(c) {
    c.save();
    c.translate(50, 50);
    c.rotate(-Math.PI / 4);
    const g = c.createLinearGradient(0, -6, 0, 6);
    g.addColorStop(0, '#dfe8f2');
    g.addColorStop(0.5, '#f8fbff');
    g.addColorStop(1, '#9fb0c4');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-46, 0);
    c.lineTo(-38, -5);
    c.lineTo(22, -5);
    c.lineTo(22, 5);
    c.lineTo(-38, 5);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(110,140,180,0.8)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-40, 0);
    c.lineTo(20, 0);
    c.stroke();
    c.fillStyle = '#8a6a2e';
    c.fillRect(22, -11, 6, 22); // guard
    c.fillStyle = '#4a3322';
    c.fillRect(28, -4, 16, 8); // grip
    c.fillStyle = '#8a6a2e';
    c.beginPath();
    c.arc(48, 0, 5, 0, Math.PI * 2); // pommel
    c.fill();
    c.restore();
  },
  knife(c) {
    c.save();
    c.translate(50, 50);
    c.rotate(-Math.PI / 4);
    c.fillStyle = '#d8dee8';
    c.beginPath();
    c.moveTo(-40, 2);
    c.lineTo(14, -6);
    c.quadraticCurveTo(20, 0, 14, 4);
    c.closePath();
    c.fill();
    c.fillStyle = '#2e1c14';
    c.beginPath();
    c.roundRect(14, -5, 26, 10, 4);
    c.fill();
    c.restore();
  },
  rope(c) {
    c.strokeStyle = '#8a6a42';
    c.lineWidth = 9;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(50, 52, 30 - i * 9, 22 - i * 6, 0.2, 0, Math.PI * 2);
      c.stroke();
    }
    c.strokeStyle = '#6b4e2c';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(72, 60);
    c.quadraticCurveTo(84, 70, 80, 84);
    c.stroke();
  },
  skeletonKey(c) {
    c.save();
    c.translate(50, 50);
    c.rotate(Math.PI / 4);
    c.strokeStyle = '#b8a878';
    c.lineWidth = 8;
    c.beginPath();
    c.arc(-22, 0, 13, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#b8a878';
    c.fillRect(-8, -4, 42, 8);
    c.fillRect(24, 2, 8, 12);
    c.fillRect(12, 2, 8, 9);
    c.restore();
  },
  bottle(c) {
    c.fillStyle = '#8a6a42';
    c.fillRect(43, 8, 14, 9);
    c.fillStyle = 'rgba(170,215,235,0.4)';
    c.beginPath();
    c.roundRect(43, 16, 14, 16, 3);
    c.fill();
    c.beginPath();
    c.roundRect(30, 32, 40, 58, 9);
    c.fill();
    c.fillStyle = 'rgba(90,160,200,0.65)';
    c.beginPath();
    c.roundRect(33, 52, 34, 35, 7);
    c.fill();
    c.strokeStyle = 'rgba(230,245,255,0.9)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(62, 38);
    c.lineTo(62, 80);
    c.stroke();
  },
  sack(c) {
    c.fillStyle = '#6b492a';
    c.beginPath();
    c.moveTo(22, 88);
    c.bezierCurveTo(14, 50, 30, 30, 50, 28);
    c.bezierCurveTo(70, 30, 86, 52, 78, 88);
    c.closePath();
    c.fill();
    c.fillStyle = '#7d5732';
    c.beginPath();
    c.ellipse(50, 26, 17, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(40,20,8,0.6)';
    c.lineWidth = 2.5;
    for (const x of [36, 50, 64]) {
      c.beginPath();
      c.moveTo(x, 40);
      c.quadraticCurveTo(x + 4, 62, x - 2, 84);
      c.stroke();
    }
  },
  // --- treasures
  egg(c) {
    const g = c.createLinearGradient(30, 20, 70, 85);
    g.addColorStop(0, '#f6e7c4');
    g.addColorStop(1, '#cfa54e');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(50, 54, 26, 34, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#3a5a9c'; // lapis inlay
    c.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(50, 54, 26, 34, 0, 0.4 + i * 0.9, 1.1 + i * 0.9);
      c.stroke();
    }
    c.fillStyle = '#7ec8c0';
    for (const [x, y] of [[40, 40], [60, 48], [46, 66], [58, 74]] as const) {
      c.beginPath();
      c.arc(x, y, 3.2, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.beginPath();
    c.ellipse(41, 36, 6, 10, 0.5, 0, Math.PI * 2);
    c.fill();
  },
  painting(c) {
    c.fillStyle = '#c8a25a';
    c.fillRect(14, 18, 72, 64);
    c.fillStyle = '#8a6a2e';
    c.fillRect(20, 24, 60, 52);
    const g = c.createLinearGradient(0, 24, 0, 76);
    g.addColorStop(0, '#7a9bd9');
    g.addColorStop(0.6, '#d98e6b');
    g.addColorStop(1, '#4a3358');
    c.fillStyle = g;
    c.fillRect(24, 28, 52, 44);
    c.fillStyle = '#2e2440';
    c.beginPath();
    c.moveTo(24, 72);
    c.lineTo(40, 52);
    c.lineTo(52, 64);
    c.lineTo(64, 44);
    c.lineTo(76, 72);
    c.closePath();
    c.fill();
  },
  bar(c) {
    c.save();
    c.translate(50, 55);
    c.rotate(-0.12);
    const g = c.createLinearGradient(-36, 0, 36, 0);
    g.addColorStop(0, '#9aa4b2');
    g.addColorStop(0.5, '#eef2f8');
    g.addColorStop(1, '#7e8896');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-38, 14);
    c.lineTo(-30, -14);
    c.lineTo(30, -14);
    c.lineTo(38, 14);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(40,50,64,0.55)';
    c.font = 'bold 11px monospace';
    c.textAlign = 'center';
    c.fillText('Pt', 0, 5);
    c.restore();
  },
  torch(c) {
    c.fillStyle = '#efe6d2';
    c.beginPath();
    c.moveTo(43, 90);
    c.lineTo(57, 90);
    c.lineTo(52, 42);
    c.lineTo(48, 42);
    c.closePath();
    c.fill();
    const g = c.createRadialGradient(50, 30, 2, 50, 30, 26);
    g.addColorStop(0, '#fff3c4');
    g.addColorStop(0.4, '#ffb45a');
    g.addColorStop(1, 'rgba(255,90,30,0)');
    c.fillStyle = g;
    c.fillRect(24, 4, 52, 52);
    c.fillStyle = '#ffd98a';
    c.beginPath();
    c.ellipse(50, 32, 8, 15, 0, 0, Math.PI * 2);
    c.fill();
  },
  coffin(c) {
    const g = c.createLinearGradient(10, 0, 90, 0);
    g.addColorStop(0, '#8a6018');
    g.addColorStop(0.5, '#ffce5e');
    g.addColorStop(1, '#7a5414');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(18, 78);
    c.lineTo(28, 26);
    c.lineTo(72, 26);
    c.lineTo(82, 78);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(90,60,10,0.7)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(30, 40);
    c.lineTo(70, 40);
    c.stroke();
    // tiny mask
    c.fillStyle = '#4a3208';
    c.beginPath();
    c.ellipse(50, 56, 9, 12, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffce5e';
    c.beginPath();
    c.arc(46, 53, 2, 0, Math.PI * 2);
    c.arc(54, 53, 2, 0, Math.PI * 2);
    c.fill();
  },
  sceptre(c) {
    c.save();
    c.translate(50, 50);
    c.rotate(Math.PI / 4);
    c.fillStyle = '#e8c05e';
    c.fillRect(-42, -3.5, 74, 7);
    for (const [x, hue] of [[-20, '#c9344a'], [0, '#2e7ec9'], [20, '#2ec98a']] as const) {
      c.fillStyle = hue;
      c.fillRect(x - 4, -5.5, 8, 11);
    }
    c.fillStyle = '#f6e0a0';
    c.beginPath();
    c.moveTo(32, -9);
    c.lineTo(46, 0);
    c.lineTo(32, 9);
    c.closePath();
    c.fill();
    c.restore();
  },
  potOfGold(c) {
    c.fillStyle = '#1c1410';
    c.beginPath();
    c.ellipse(50, 62, 30, 26, 0, 0, Math.PI);
    c.fill();
    c.beginPath();
    c.ellipse(50, 62, 30, 8, 0, Math.PI, 0);
    c.fill();
    const g = c.createLinearGradient(0, 40, 0, 60);
    g.addColorStop(0, '#ffe08a');
    g.addColorStop(1, '#c9962e');
    c.fillStyle = g;
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.ellipse(30 + (i % 4) * 13.5, 52 - Math.floor(i / 4) * 8, 7, 4.4, 0.2, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = '#ff6a6a';
    c.lineWidth = 3.5;
    for (const [hue, r] of [['#ff6a6a', 40], ['#ffe95f', 34], ['#5fb9ff', 28]] as const) {
      c.strokeStyle = hue;
      c.beginPath();
      c.arc(76, 66, r, Math.PI * 1.05, Math.PI * 1.5);
      c.stroke();
    }
  },
  trunk(c) {
    const g = c.createLinearGradient(14, 0, 86, 0);
    g.addColorStop(0, '#3d2a12');
    g.addColorStop(0.5, '#6b4a22');
    g.addColorStop(1, '#33220e');
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(16, 46, 68, 38, 5);
    c.fill();
    c.beginPath();
    c.ellipse(50, 46, 34, 14, 0, Math.PI, 0);
    c.fill();
    c.strokeStyle = '#a5814a';
    c.lineWidth = 4;
    for (const x of [30, 50, 70]) {
      c.beginPath();
      c.moveTo(x, 34);
      c.lineTo(x, 84);
      c.stroke();
    }
    for (const [x, y, hue] of [[36, 38, '#d94a6a'], [50, 34, '#3ac98a'], [64, 38, '#4a7ad9']] as const) {
      c.fillStyle = hue;
      c.beginPath();
      c.moveTo(x, y - 6);
      c.lineTo(x + 5, y);
      c.lineTo(x, y + 6);
      c.lineTo(x - 5, y);
      c.closePath();
      c.fill();
    }
  },
  coins(c) {
    c.fillStyle = '#4a3624';
    c.beginPath();
    c.moveTo(28, 88);
    c.bezierCurveTo(20, 58, 32, 40, 50, 38);
    c.bezierCurveTo(68, 40, 80, 60, 72, 88);
    c.closePath();
    c.fill();
    c.strokeStyle = '#2a1c10';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(50, 38, 14, 6, 0, 0, Math.PI * 2);
    c.stroke();
    const g = c.createLinearGradient(0, 20, 0, 40);
    g.addColorStop(0, '#ffe08a');
    g.addColorStop(1, '#c9962e');
    c.fillStyle = g;
    for (const [x, y] of [[42, 30], [56, 26], [50, 18]] as const) {
      c.beginPath();
      c.ellipse(x, y, 8, 5, 0.15, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(120,80,20,0.6)';
      c.lineWidth = 1.2;
      c.stroke();
    }
  },
  chalice(c) {
    const g = c.createLinearGradient(30, 0, 70, 0);
    g.addColorStop(0, '#8a94a5');
    g.addColorStop(0.45, '#f2f7ff');
    g.addColorStop(1, '#6e7888');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(28, 22);
    c.bezierCurveTo(28, 48, 40, 56, 50, 57);
    c.bezierCurveTo(60, 56, 72, 48, 72, 22);
    c.closePath();
    c.fill();
    c.beginPath();
    c.ellipse(50, 22, 22, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillRect(46, 56, 8, 18);
    c.beginPath();
    c.arc(50, 68, 6, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(50, 84, 17, 5.5, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(70,80,100,0.7)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(50, 32, 19, 5, 0, 0, Math.PI);
    c.stroke();
  },
};

/** generic fallback: a small adventurer's pouch */
function fallback(c: CanvasRenderingContext2D) {
  c.fillStyle = '#4a3a28';
  c.beginPath();
  c.moveTo(26, 84);
  c.bezierCurveTo(20, 56, 32, 42, 50, 40);
  c.bezierCurveTo(68, 42, 80, 58, 74, 84);
  c.closePath();
  c.fill();
  c.strokeStyle = '#8a6a42';
  c.lineWidth = 4;
  c.beginPath();
  c.ellipse(50, 40, 13, 5, 0, 0, Math.PI * 2);
  c.stroke();
}

export function iconFor(id: string, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const c = canvas.getContext('2d')!;
  c.scale((size / 100) * dpr, (size / 100) * dpr);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  (painters[id] ?? fallback)(c);
  return canvas;
}

export function hasIcon(id: string): boolean {
  return id in painters;
}
