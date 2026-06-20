#!/usr/bin/env node
/** Generates Aurora's app icon set (icon, adaptive icon layers, splash, favicon) from inline SVG. */
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'images');

// The Aurora orb: radial aurora gradient with a soft halo on a deep navy sky.
const orb = (cx, cy, r, withHalo = true) => `
  ${withHalo ? `<circle cx="${cx}" cy="${cy}" r="${r * 1.45}" fill="url(#halo)"/>` : ''}
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#orb)"/>
  <ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.38}" rx="${r * 0.42}" ry="${r * 0.3}" fill="url(#shine)"/>
`;

const defs = `
  <defs>
    <radialGradient id="orb" cx="38%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#EDFDFB"/>
      <stop offset="30%" stop-color="#4FD1C5"/>
      <stop offset="68%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#A78BFA"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="55%" stop-color="#818CF8" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#818CF8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shine" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0E1530"/>
      <stop offset="100%" stop-color="#0A0F1E"/>
    </linearGradient>
  </defs>
`;

const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  ${orb(512, 512, 300)}
</svg>`;

// Adaptive foreground: orb within the inner ~66% safe zone, transparent bg
const foregroundSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  ${orb(512, 512, 240)}
</svg>`;

const backgroundSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;

const monoSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <circle cx="512" cy="512" r="240" fill="#FFFFFF"/>
</svg>`;

const splashSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  ${orb(512, 512, 280)}
</svg>`;

async function render(svg, file, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT, file));
  console.log('✓', file);
}

(async () => {
  await render(iconSvg, 'icon.png', 1024);
  await render(foregroundSvg, 'android-icon-foreground.png', 1024);
  await render(backgroundSvg, 'android-icon-background.png', 1024);
  await render(monoSvg, 'android-icon-monochrome.png', 1024);
  await render(splashSvg, 'splash-icon.png', 512);
  await render(iconSvg, 'favicon.png', 48);
})();
