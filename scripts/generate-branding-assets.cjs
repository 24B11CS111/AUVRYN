const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}
const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function generatePng(width, height, drawFn) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const pixel = drawFn(x, y, width, height);
      const offset = 1 + x * 4;
      row[offset] = pixel[0];
      row[offset + 1] = pixel[1];
      row[offset + 2] = pixel[2];
      row[offset + 3] = pixel[3];
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

// Colors:
// Primary Navy: #0B1E3F -> [11, 30, 63]
// Deep Navy: #07152B -> [7, 21, 43]
// Electric Blue: #2563EB -> [37, 99, 235]
// Light Blue: #93C5FD -> [147, 197, 253]
// Pure White: #FFFFFF -> [255, 255, 255]

// Draw AUVRYN Icon (Navy background, pure white book, electric blue bars, white cap, electric spark)
function drawAuvrynIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background: Deep Navy
  let r = 11, g = 30, b = 63, a = 255;

  const cx = 0.5;
  const cy = 0.52;

  // 1. Graduation Cap (Top)
  // Diamond centered at (0.5, 0.22)
  const capTopY = 0.12;
  const capMidY = 0.23;
  const capBotY = 0.33;
  const capLeftX = 0.24;
  const capRightX = 0.76;

  // Check diamond interior
  if (ny >= capTopY && ny <= capBotY) {
    let halfWidth;
    if (ny < capMidY) {
      halfWidth = (capRightX - 0.5) * ((ny - capTopY) / (capMidY - capTopY));
    } else {
      halfWidth = (capRightX - 0.5) * ((capBotY - ny) / (capBotY - capMidY));
    }
    if (Math.abs(nx - 0.5) <= halfWidth) {
      // Mortarboard surface: White with subtle electric blue border
      if (Math.abs(Math.abs(nx - 0.5) - halfWidth) < 0.02) {
        return [37, 99, 235, 255]; // Electric blue rim
      }
      return [255, 255, 255, 255]; // Pure white cap
    }
  }

  // Tassel
  if (nx >= 0.74 && nx <= 0.81 && ny >= 0.22 && ny <= 0.36) {
    return [96, 165, 250, 255];
  }

  // 2. Rising Analytics Bars (Center)
  // Bar 1: Left
  if (nx >= 0.36 && nx <= 0.42 && ny >= 0.44 && ny <= 0.60) {
    return [96, 165, 250, 255]; // Sky/Light Blue
  }
  // Bar 2: Mid
  if (nx >= 0.47 && nx <= 0.53 && ny >= 0.36 && ny <= 0.60) {
    return [37, 99, 235, 255]; // Electric Blue
  }
  // Bar 3: Right
  if (nx >= 0.58 && nx <= 0.64 && ny >= 0.28 && ny <= 0.60) {
    return [29, 78, 216, 255]; // Royal Blue
  }

  // 3. Open Book Wings (Bottom)
  // Left wing
  if (nx >= 0.14 && nx <= 0.50 && ny >= 0.56 && ny <= 0.80) {
    const curveTop = 0.56 + (0.50 - nx) * 0.2;
    const curveBot = 0.78 - (nx - 0.14) * 0.1;
    if (ny >= curveTop && ny <= curveBot) {
      return [255, 255, 255, 255];
    }
  }
  // Right wing
  if (nx >= 0.50 && nx <= 0.86 && ny >= 0.56 && ny <= 0.80) {
    const curveTop = 0.56 + (nx - 0.50) * 0.2;
    const curveBot = 0.78 - (0.86 - nx) * 0.1;
    if (ny >= curveTop && ny <= curveBot) {
      return [241, 245, 249, 255];
    }
  }

  // Center spine
  if (Math.abs(nx - 0.50) < 0.008 && ny >= 0.56 && ny <= 0.80) {
    return [11, 30, 63, 255];
  }

  // 4. Intelligent Spark (Top Right)
  const sparkX = 0.82;
  const sparkY = 0.14;
  const dx = Math.abs(nx - sparkX);
  const dy = Math.abs(ny - sparkY);
  if (dx * dy < 0.0006 && (dx + dy) < 0.06) {
    return [37, 99, 235, 255]; // Electric Blue Spark
  }

  // 5. Orbital Ring dots
  const dOrb1 = Math.hypot(nx - 0.10, ny - 0.64);
  const dOrb2 = Math.hypot(nx - 0.90, ny - 0.48);
  if (dOrb1 < 0.022 || dOrb2 < 0.022) {
    return [37, 99, 235, 255];
  }

  return [r, g, b, a];
}

// Draw Splash / Foreground Icon (Transparent or white background)
function drawAuvrynSplash(x, y, w, h) {
  // Pure white canvas background with centered emblem
  const nx = x / w;
  const ny = y / h;

  // Pure White Background
  let r = 255, g = 255, b = 255, a = 255;

  // Scale emblem within central 70%
  const ex = (nx - 0.15) / 0.7;
  const ey = (ny - 0.15) / 0.7;

  if (ex >= 0 && ex <= 1 && ey >= 0 && ey <= 1) {
    // 1. Graduation Cap
    const capTopY = 0.12;
    const capMidY = 0.23;
    const capBotY = 0.33;
    const capLeftX = 0.24;
    const capRightX = 0.76;

    if (ey >= capTopY && ey <= capBotY) {
      let halfWidth = (ey < capMidY)
        ? (capRightX - 0.5) * ((ey - capTopY) / (capMidY - capTopY))
        : (capRightX - 0.5) * ((capBotY - ey) / (capBotY - capMidY));
      if (Math.abs(ex - 0.5) <= halfWidth) {
        return [7, 21, 43, 255]; // Deep Navy Cap
      }
    }
    // Tassel
    if (ex >= 0.74 && ex <= 0.81 && ey >= 0.22 && ey <= 0.36) {
      return [37, 99, 235, 255];
    }

    // 2. Rising Analytics Bars
    if (ex >= 0.36 && ex <= 0.42 && ey >= 0.44 && ey <= 0.60) {
      return [59, 130, 246, 255];
    }
    if (ex >= 0.47 && ex <= 0.53 && ey >= 0.36 && ey <= 0.60) {
      return [37, 99, 235, 255];
    }
    if (ex >= 0.58 && ex <= 0.64 && ey >= 0.28 && ey <= 0.60) {
      return [29, 78, 216, 255];
    }

    // 3. Open Book Wings
    if (ex >= 0.14 && ex <= 0.50 && ey >= 0.56 && ey <= 0.80) {
      const curveTop = 0.56 + (0.50 - ex) * 0.2;
      const curveBot = 0.78 - (ex - 0.14) * 0.1;
      if (ey >= curveTop && ey <= curveBot) {
        return [11, 30, 63, 255]; // Primary Navy
      }
    }
    if (ex >= 0.50 && ex <= 0.86 && ey >= 0.56 && ey <= 0.80) {
      const curveTop = 0.56 + (ex - 0.50) * 0.2;
      const curveBot = 0.78 - (0.86 - ex) * 0.1;
      if (ey >= curveTop && ey <= curveBot) {
        return [20, 44, 76, 255]; // Secondary Navy
      }
    }

    // Spine
    if (Math.abs(ex - 0.50) < 0.008 && ey >= 0.56 && ey <= 0.80) {
      return [226, 232, 240, 255];
    }

    // Spark
    const dx = Math.abs(ex - 0.82);
    const dy = Math.abs(ey - 0.14);
    if (dx * dy < 0.0006 && (dx + dy) < 0.06) {
      return [37, 99, 235, 255];
    }

    // Orbit nodes
    if (Math.hypot(ex - 0.10, ey - 0.64) < 0.022 || Math.hypot(ex - 0.90, ey - 0.48) < 0.022) {
      return [37, 99, 235, 255];
    }
  }

  return [r, g, b, a];
}

console.log('Generating AUVRYN PNG assets...');

const iconPng = generatePng(512, 512, drawAuvrynIcon);
const splashPng = generatePng(512, 512, drawAuvrynSplash);
const favPng = generatePng(64, 64, drawAuvrynIcon);

const targets = [
  { p: 'apps/web/public/branding/app-icon.png', data: iconPng },
  { p: 'apps/web/public/branding/splash-logo.png', data: splashPng },
  { p: 'apps/web/public/favicon.png', data: favPng },
  { p: 'apps/mobile/assets/branding/app-icon.png', data: iconPng },
  { p: 'apps/mobile/assets/branding/splash-logo.png', data: splashPng },
  { p: 'apps/mobile/assets/icon.png', data: iconPng },
  { p: 'apps/mobile/assets/adaptive-icon.png', data: splashPng },
  { p: 'apps/mobile/assets/splash.png', data: splashPng },
  { p: 'apps/mobile/assets/favicon.png', data: favPng },
];

targets.forEach(({ p, data }) => {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, data);
  console.log('Generated:', p, '(' + data.length + ' bytes)');
});

console.log('AUVRYN PNG Assets Generation Complete!');
