# Backend Ecolojia - Configuration de travail

## Serveur fonctionnel
- Fichier : server-postgres-fixed.js
- Port : 3000
- Mode : Stockage m�moire (PostgreSQL non connect�)

## Commandes pour d�marrer
1. Ouvrir terminal dans : backend\ecolojia-backendV1-main\ecolojia-backendV1-main
2. Ex�cuter : node server-postgres-fixed.js

## Endpoints test�s et fonctionnels
- GET  / : Info serveur
- GET  /health : Statut
- POST /api/auth/register : Inscription
- POST /api/auth/login : Connexion  
- GET  /api/users : Liste utilisateurs

## Utilisateurs de test
- test2@example.com / Test123!
- admin@ecolojia.com / Admin123!

## Prochaines �tapes
1. Frontend : Connecter l'interface au backend
2. Base de donn�es : Configurer PostgreSQL correctement
3. Fonctionnalit�s : Ajouter routes produits et analyses
