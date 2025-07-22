// PATH: backend/src/auth/services/EmailService.ts
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_USER || 'samnamarad@gmail.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'ECOLOJIA';
    
    // Configuration Gmail SMTP
    // ✅ CORRECTION
this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
      secure: false, // true pour port 465, false pour autres ports
      auth: {
        user: this.fromEmail,
        pass: process.env.EMAIL_APP_PASSWORD || 'dtue tgtd qoij dgil'
      }
    });
  }

  /**
   * Envoyer email de validation après inscription
   */
  async sendVerificationEmail(userId: string, email: string, name: string): Promise<boolean> {
    try {
      // Générer token de validation
      const token = this.generateVerificationToken();
      
      // Enregistrer token en base
      await prisma.emailVerification.create({
        data: {
          userId,
          email,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        }
      });

      // URL de validation
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
      
      // Template HTML email
      const html = this.getVerificationEmailTemplate(name, verificationUrl);
      
      // Envoyer email
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: '🌿 Activez votre compte ECOLOJIA',
        html
      });

      console.log('✅ Email de validation envoyé:', result.messageId);
      return true;

    } catch (error: any) {
      console.error('❌ Erreur envoi email:', error);
      return false;
    }
  }

  /**
   * Renvoyer email de validation
   */
  async resendVerificationEmail(email: string): Promise<boolean> {
    try {
      // Trouver utilisateur
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.emailVerified) {
        throw new Error('Email déjà vérifié');
      }

      // Invalider anciens tokens
      await prisma.emailVerification.updateMany({
        where: { email },
        data: { verified: true } // Marquer comme utilisés
      });

      // Envoyer nouveau email
      return await this.sendVerificationEmail(user.id, user.email, user.name);

    } catch (error: any) {
      console.error('❌ Erreur renvoi email:', error);
      return false;
    }
  }

  /**
   * Vérifier token de validation email
   */
  async verifyEmailToken(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // Chercher token valide
      const verification = await prisma.emailVerification.findFirst({
        where: {
          token,
          verified: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (!verification) {
        return {
          success: false,
          message: 'Token invalide ou expiré'
        };
      }

      // Marquer token comme utilisé
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { verified: true }
      });

      // Marquer utilisateur comme vérifié
      await prisma.user.update({
        where: { id: verification.userId! },
        data: { emailVerified: true }
      });

      return {
        success: true,
        message: 'Email vérifié avec succès'
      };

    } catch (error: any) {
      console.error('❌ Erreur vérification token:', error);
      return {
        success: false,
        message: 'Erreur lors de la vérification'
      };
    }
  }

  // === TEMPLATES EMAIL ===

  private getVerificationEmailTemplate(name: string, verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activez votre compte ECOLOJIA</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 20px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 20px; }
    .button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌿 ECOLOJIA</h1>
      <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Votre assistant IA pour une consommation responsable</p>
    </div>
    
    <div class="content">
      <h2>Bonjour ${name} !</h2>
      
      <p>Bienvenue sur <strong>ECOLOJIA</strong> ! Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
      
      <p>Pour finaliser votre inscription et accéder à toutes nos fonctionnalités, veuillez <strong>activer votre compte</strong> en cliquant sur le bouton ci-dessous :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" class="button">✅ Activer mon compte</a>
      </div>
      
      <p><strong>Ce que vous pouvez faire avec ECOLOJIA :</strong></p>
      <ul>
        <li>🔍 <strong>30 analyses gratuites par mois</strong> de vos produits</li>
        <li>🔬 <strong>IA scientifique avancée</strong> basée sur INSERM/ANSES</li>
        <li>📱 <strong>Scanner universel</strong> alimentaire, cosmétique, détergent</li>
        <li>📊 <strong>Scores santé détaillés</strong> avec alternatives</li>
        <li>🌱 <strong>Conseils personnalisés</strong> pour une consommation responsable</li>
      </ul>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;"><strong>⏰ Important :</strong> Ce lien expire dans <strong>24 heures</strong>. Activez votre compte rapidement !</p>
      </div>
      
      <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
      <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px;">
        ${verificationUrl}
      </p>
      
      <p>Si vous n'avez pas créé de compte ECOLOJIA, vous pouvez ignorer cet email en toute sécurité.</p>
      
      <p>À bientôt sur ECOLOJIA !<br>
      L'équipe ECOLOJIA 🌿</p>
    </div>
    
    <div class="footer">
      <p>© 2024 ECOLOJIA - Assistant IA pour consommation responsable</p>
      <p>Cet email a été envoyé à ${name} pour la validation du compte ECOLOJIA.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // === MÉTHODES UTILITAIRES ===

  private generateVerificationToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

export const emailService = new EmailService();