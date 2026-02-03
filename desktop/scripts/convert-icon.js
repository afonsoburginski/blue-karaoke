const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/icon.png');
const outputPath = path.join(__dirname, '../public/icon.ico');

async function convert() {
  // Criar múltiplos tamanhos para o ICO (16, 32, 48, 64, 128, 256)
  const sizes = [16, 32, 48, 64, 128, 256];
  const buffers = [];

  for (const size of sizes) {
    const buffer = await sharp(inputPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    buffers.push(buffer);
  }

  const ico = await toIco(buffers);
  fs.writeFileSync(outputPath, ico);
  console.log('ICO criado com sucesso:', outputPath);
}

convert().catch(console.error);
