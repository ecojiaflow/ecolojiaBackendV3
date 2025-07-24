// PATH: backend/src/routes/ai.routes.ts
import { Router } from 'express';
import { authenticate } from '../auth/middleware/auth';
import { aiAnalysisService } from '../services/ai/AIAnalysisService';

const router = Router();

/* POST /api/ai/analyze */
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { productName, category, ingredients, prompt } = req.body;
    const data = await aiAnalysisService.analyze({
      productName,
      category,
      ingredients,
      userId: req.user!.id,
      premium: req.user!.tier === 'premium',
      prompt
    });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
// EOF
