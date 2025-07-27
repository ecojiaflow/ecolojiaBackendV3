# Backend Ecolojia - Configuration de travail

## Serveur fonctionnel
- Fichier : server-postgres-fixed.js
- Port : 3000
- Mode : Stockage mémoire (PostgreSQL non connecté)

## Commandes pour démarrer
1. Ouvrir terminal dans : backend\ecolojia-backendV1-main\ecolojia-backendV1-main
2. Exécuter : node server-postgres-fixed.js

## Endpoints testés et fonctionnels
- GET  / : Info serveur
- GET  /health : Statut
- POST /api/auth/register : Inscription
- POST /api/auth/login : Connexion  
- GET  /api/users : Liste utilisateurs

## Utilisateurs de test
- test2@example.com / Test123!
- admin@ecolojia.com / Admin123!

## Prochaines étapes
1. Frontend : Connecter l'interface au backend
2. Base de données : Configurer PostgreSQL correctement
3. Fonctionnalités : Ajouter routes produits et analyses
