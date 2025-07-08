const vision = require('@google-cloud/vision');

// Le client Vision lit automatiquement GOOGLE_APPLICATION_CREDENTIALS
const client = new vision.ImageAnnotatorClient();

async function analyzeImageOCR(base64Image) {
  try {
    const [result] = await client.documentTextDetection({
      image: { content: base64Image },
    });

    const text = result.fullTextAnnotation?.text || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const name = lines[0] || 'Produit inconnu';
    const brand = extractBrand(lines);
    const category = extractCategory(lines);

    return {
      success: true,
      name,
      brand,
      category,
      rawText: text,
      lines
    };
  } catch (error) {
    console.error('❌ Vision OCR failed:', error.message);
    return { success: false, error: error.message };
  }
}

function extractBrand(lines) {
  const knownBrands = ['Bjorg', 'Evian', 'Barilla', 'Danone', 'Carrefour', 'Monoprix'];
  return lines.find(line => knownBrands.some(b => line.toLowerCase().includes(b.toLowerCase()))) || 'Marque inconnue';
}

function extractCategory(lines) {
  const cats = ['yaourt', 'eau', 'biscuit', 'pâtes', 'boisson', 'lait', 'snack'];
  return lines.find(line => cats.some(c => line.toLowerCase().includes(c))) || 'alimentaire';
}

module.exports = { analyzeImageOCR };
