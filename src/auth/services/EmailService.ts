// 🔴 BACKEND - backend/src/auth/services/EmailService.ts

import { Logger } from '../../utils/Logger';

export class EmailService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('EmailService');
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    // Pour le moment, on log juste (remplacer par vraie implémentation plus tard)
    this.logger.info('Sending verification email', {
      email,
      name,
      verificationUrl
    });

    // Simuler envoi email
    console.log(`
📧 EMAIL DE VÉRIFICATION
To: ${email}
Subject: Vérifiez votre email ECOLOJIA

Bonjour ${name},

Cliquez sur ce lien pour vérifier votre email :
${verificationUrl}

L'équipe ECOLOJIA
    `);
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
    
    this.logger.info('Sending password reset email', {
      email,
      name,
      resetUrl
    });

    console.log(`
📧 EMAIL DE RESET
To: ${email}
Subject: Réinitialisation mot de passe ECOLOJIA

Bonjour ${name},

Cliquez sur ce lien pour réinitialiser votre mot de passe :
${resetUrl}

L'équipe ECOLOJIA
    `);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    this.logger.info('Sending welcome email', { email, name });
    
    console.log(`
📧 EMAIL DE BIENVENUE  
To: ${email}
Subject: Bienvenue sur ECOLOJIA !

Bonjour ${name},

Bienvenue sur ECOLOJIA ! Votre compte est maintenant actif.

L'équipe ECOLOJIA
    `);
  }
}