// PATH: src/controllers/similar.controller.ts
import { Request, Response } from 'express';
import { SimilarService } from '../services/similar.service';

const similarService = new SimilarService();

export const findClosestOption = async (req: Request, res: Response) => {
  try {
    const { text, options } = req.body;

    if (!text || !Array.isArray(options)) {
      return res.status(400).json({ error: 'Requête invalide. "text" et "options[]" requis.' });
    }

    const closest = similarService.findClosest({ text, options });

    res.json({ closest });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur interne similarité' });
  }
};
// EOF
