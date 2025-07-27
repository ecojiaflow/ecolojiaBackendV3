// PATH: backend/src/controllers/similar.controller.ts
import { Request, Response } from 'express';

export const findClosestOption = async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query requis'
      });
    }

    // TODO: Implémenter la recherche de similarité
    const results = [
      { name: 'Option 1', similarity: 0.95 },
      { name: 'Option 2', similarity: 0.85 }
    ];
    
    return res.json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('Similar controller error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
