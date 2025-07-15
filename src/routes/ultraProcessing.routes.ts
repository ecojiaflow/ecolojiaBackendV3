// PATH: backend/src/routes/ultraProcessing.routes.ts
import { Router } from 'express';

const router = Router();

// 🔎 Liste simplifiée des procédés ultra-transformants connus
const suspiciousKeywords = [
  'extrusion',
  'hydrogénation',
  'maltodextrine',
  'arôme artificiel',
  'emulsifiant',
  'correcteur d’acidité',
  'colorant',
  'édulcorant',
  'gomme xanthane',
  'monoglyceride',
  'E',
  'conservateur'
];

// 🔬 Analyse IA ultra-transformation
export const detectUltraTransformation = (ingredients: string[]): {
  level: 'léger' | 'modéré' | 'sévère';
  score: number;
  detected: string[];
  justification: string;
} => {
  const found: string[] = [];

  for (const ing of ingredients) {
    for (const keyword of suspiciousKeywords) {
      if (ing.toLowerCase().includes(keyword)) {
        if (!found.includes(keyword)) {
          found.push(keyword); // ✅ Pas besoin de Set
        }
      }
    }
  }

  let level: 'léger' | 'modéré' | 'sévère' = 'léger';
  let score = 25;

  if (found.length >= 3) {
    level = 'sévère';
    score = 90;
  } else if (found.length === 2) {
    level = 'modéré';
    score = 65;
  } else if (found.length === 1) {
    level = 'léger';
    score = 40;
  }

  return {
    level,
    score,
    detected: found,
    justification: `Analyse des ingrédients : ${found.length} procédé(s) suspect(s) détecté(s) (${found.join(', ')})`
  };
};

router.post('/analyze', (req, res) => {
  const { title, ingredients } = req.body.product || {};

  if (!title || !ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ success: false, error: 'Produit incomplet ou mal formé' });
  }

  const result = detectUltraTransformation(ingredients);

  return res.json({
    success: true,
    product: title,
    ultraProcessing: result,
    sources: [
      'Monteiro et al. NOVA 2019',
      'EFSA 2021',
      'INSERM 2024',
      'ANSES 2022'
    ]
  });
});

export default router;
// EOF
