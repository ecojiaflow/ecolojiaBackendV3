import { Request, Response } from 'express';
// PATH: backend/src/routes/emailValidation.ts
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { emailValidationService } from '../auth/services/EmailValidationService'; // âœ… Import corrigÃ©

const router = express.Router();

// === MIDDLEWARE DE VALIDATION ===

const verifyTokenValidation = [
  body('token')
    .isLength({ min: 32, max: 128 })
    .withMessage('Token de validation invalide')
];

const resendEmailValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide')
];

const statusEmailValidation = [
  param('email')
    .isEmail()
    .withMessage('Email invalide')
];

// === ROUTES EMAIL VALIDATION ===

/**
 * POST /api/email-validation/verify
 * VÃ©rification token email
 */
router.post('/verify', verifyTokenValidation, async (req: Request, res: Response) => {
  try {
    // Validation des donnÃ©es
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide',
        errors: errors.array()
      });
    }

    const { token } = req.body;

    console.log('ðŸ” VÃ©rification token email:', token.substring(0, 8) + '...');

    // Appel service de vÃ©rification
    const result = await emailValidationService.verifyToken(token);

    const statusCode = result.success ? 200 : 400;
    
    console.log(result.success ? 'âœ…' : 'âŒ', 'VÃ©rification token:', result.message);

    res.status(statusCode).json(result);

  } catch (error: any) {
    console.error('âŒ Email verification error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vÃ©rification'
    });
  }
});

/**
 * POST /api/email-validation/resend
 * Renvoyer email de validation
 */
router.post('/resend', resendEmailValidation, async (req: Request, res: Response) => {
  try {
    // Validation des donnÃ©es
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    console.log('ðŸ“§ Renvoi email validation demandÃ© pour:', email);

    // Appel service de renvoi
    const result = await emailValidationService.resendVerificationEmail(email);

    const statusCode = result.success ? 200 : 400;
    
    console.log(result.success ? 'âœ…' : 'âŒ', 'Renvoi email:', result.message);

    res.status(statusCode).json(result);

  } catch (error: any) {
    console.error('âŒ Email resend error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du renvoi'
    });
  }
});

/**
 * GET /api/email-validation/status/:email
 * RÃ©cupÃ©rer statut validation email
 */
router.get('/status/:email', statusEmailValidation, async (req: Request, res: Response) => {
  try {
    // Validation des donnÃ©es
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide',
        errors: errors.array()
      });
    }

    const { email } = req.params;

    console.log('ðŸ“Š VÃ©rification statut email:', email);

    // Appel service de statut
    const result = await emailValidationService.getValidationStatus(email);

    const statusCode = result.success ? 200 : 404;
    
    res.status(statusCode).json(result);

  } catch (error: any) {
    console.error('âŒ Email status error:', error); return res.status(500).json({ error: "Erreur serveur" });
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la rÃ©cupÃ©ration du statut'
    });
  }
});

export default router;


