"use strict";
// 🔴 BACKEND - backend/src/auth/services/EmailService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const Logger_1 = require("../../utils/Logger");
class EmailService {
    constructor() {
        this.logger = new Logger_1.Logger('EmailService');
    }
    async sendVerificationEmail(email, name, token) {
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
    async sendPasswordResetEmail(email, name, token) {
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
    async sendWelcomeEmail(email, name) {
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
exports.EmailService = EmailService;
