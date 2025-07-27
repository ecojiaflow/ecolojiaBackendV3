// PATH: backend/src/controllers/track.controller.ts
import { Request, Response } from 'express';

export const trackClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Implémenter le tracking sans Prisma
    // Pour l'instant, on retourne juste un succès
    
    res.redirect('https://example.com'); // Remplacer par l'URL réelle
    
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const trackAffiliateClick = trackClick; // Alias pour compatibilité

