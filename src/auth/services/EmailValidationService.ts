// PATH: backend/src/auth/services/EmailValidationService.ts
// // import { PrismaClient } from '@prisma/client';
import { emailService } from './EmailService'; // âœ… Import corrigÃ©

const prisma = null // new PrismaClient();

export interface ValidationResult {
  success: boolean;
  message: string;
  data?: any;
}

export class EmailValidationService {
  
  /**
   * VÃ©rifier un token de validation email
   */
  async verifyToken(token: string): Promise<ValidationResult> {
    try {
      console.log('ðŸ” VÃ©rification token email:', token);
      
      if (!token || token.length < 32) {
        return {
          success: false,
          message: 'Token de validation invalide'
        };
      }

      // Chercher token dans la base
      // const verification = await prisma.emailVerification.findFirst({ // PRISMA DISABLED
        where: {
          token,
          verified: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              emailVerified: true
            }
          }
        }
      });

      if (!verification) {
        console.log('âŒ Token non trouvÃ© ou expirÃ©');
        return {
          success: false,
          message: 'Token de validation invalide ou expirÃ©. Veuillez demander un nouveau lien de validation.'
        };
      }

      if (!verification.user) {
        console.log('âŒ Utilisateur associÃ© au token non trouvÃ©');
        return {
          success: false,
          message: 'Utilisateur non trouvÃ©'
        };
      }

      if (verification.user.emailVerified) {
        console.log('âœ… Email dÃ©jÃ  vÃ©rifiÃ© pour:', verification.user.email);
        return {
          success: true,
          message: 'Votre email est dÃ©jÃ  vÃ©rifiÃ©',
          data: { user: verification.user }
        };
      }

      // Transaction pour marquer comme vÃ©rifiÃ©
      // // await prisma.$transaction(async (tx) => { // PRISMA DISABLED // PRISMA DISABLED
        // Marquer token comme utilisÃ©
        await tx.emailVerification.update({
          where: { id: verification.id },
          data: { 
            verified: true,
            updatedAt: new Date()
          }
        });

        // Marquer utilisateur comme vÃ©rifiÃ©
        await tx.user.update({
          where: { id: verification.user!.id },
          data: { 
            emailVerified: true,
            updatedAt: new Date()
          }
        });
      });

      console.log('âœ… Email vÃ©rifiÃ© avec succÃ¨s pour:', verification.user.email);
      
      return {
        success: true,
        message: `Email vÃ©rifiÃ© avec succÃ¨s ! Bienvenue ${verification.user.name}.`,
        data: { 
          user: {
            ...verification.user,
            emailVerified: true
          }
        }
      };

    } catch (error: any) {
      console.error('âŒ Erreur vÃ©rification email token:', error);
      return {
        success: false,
        message: 'Erreur lors de la vÃ©rification. Veuillez rÃ©essayer.'
      };
    }
  }

  /**
   * Renvoyer un email de validation
   */
  async resendVerificationEmail(email: string): Promise<ValidationResult> {
    try {
      console.log('ðŸ“§ Renvoi email de validation pour:', email);

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Adresse email invalide'
        };
      }

      // Chercher utilisateur
      // const user = await prisma.user.findUnique({ // PRISMA DISABLED
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true
        }
      });

      if (!user) {
        // SÃ©curitÃ© : ne pas rÃ©vÃ©ler si l'email existe ou non
        return {
          success: true,
          message: 'Si cet email correspond Ã  un compte ECOLOJIA, un nouveau lien de validation sera envoyÃ©.'
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          message: 'Cet email est dÃ©jÃ  vÃ©rifiÃ©'
        };
      }

      // VÃ©rifier limite de renvoi (max 3 par heure)
      // const recentVerifications = await prisma.emailVerification.count({ // PRISMA DISABLED
        where: {
          email: email.toLowerCase(),
          createdAt: {
            gt: new Date(Date.now() - 60 * 60 * 1000) // 1 heure
          }
        }
      });

      if (recentVerifications >= 3) {
        return {
          success: false,
          message: 'Limite de renvoi atteinte. Veuillez attendre une heure avant de demander un nouveau lien.'
        };
      }

      // Invalider anciens tokens non utilisÃ©s
      // await prisma.emailVerification.updateMany({ // PRISMA DISABLED
        where: {
          email: email.toLowerCase(),
          verified: false
        },
        data: { verified: true } // Les marquer comme "utilisÃ©s" pour les invalider
      });

      // Envoyer nouveau email
      const emailSent = await emailService.sendVerificationEmail(
        user.id,
        user.email,
        user.name
      );

      if (!emailSent) {
        return {
          success: false,
          message: 'Erreur lors de l\'envoi de l\'email. Veuillez rÃ©essayer.'
        };
      }

      console.log('âœ… Email de validation renvoyÃ© Ã :', email);

      return {
        success: true,
        message: 'Un nouveau lien de validation a Ã©tÃ© envoyÃ© Ã  votre adresse email.'
      };

    } catch (error: any) {
      console.error('âŒ Erreur renvoi email validation:', error);
      return {
        success: false,
        message: 'Erreur lors du renvoi. Veuillez rÃ©essayer.'
      };
    }
  }

  /**
   * Obtenir le statut de validation d'un email
   */
  async getValidationStatus(email: string): Promise<ValidationResult> {
    try {
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Adresse email invalide'
        };
      }

      // const user = await prisma.user.findUnique({ // PRISMA DISABLED
        where: { email: email.toLowerCase() },
        select: {
          email: true,
          emailVerified: true,
          createdAt: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'Aucun compte trouvÃ© avec cet email'
        };
      }

      return {
        success: true,
        message: 'Statut rÃ©cupÃ©rÃ©',
        data: {
          email: user.email,
          verified: user.emailVerified,
          accountCreated: user.createdAt
        }
      };

    } catch (error: any) {
      console.error('âŒ Erreur rÃ©cupÃ©ration statut:', error);
      return {
        success: false,
        message: 'Erreur lors de la rÃ©cupÃ©ration du statut'
      };
    }
  }

  // === MÃ‰THODES UTILITAIRES ===

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const emailValidationService = new EmailValidationService();

