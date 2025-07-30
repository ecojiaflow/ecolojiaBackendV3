// backend/src/utils/errors.js

// Classe de base pour toutes les erreurs custom
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Erreur de validation (400)
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// Erreur d'authentification (401)
class AuthenticationError extends AppError {
  constructor(message = 'Authentification requise') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Erreur d'autorisation (403)
class AuthorizationError extends AppError {
  constructor(message = 'Accès non autorisé') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Ressource non trouvée (404)
class NotFoundError extends AppError {
  constructor(message = 'Ressource non trouvée') {
    super(message, 404, 'NOT_FOUND');
  }
}

// Conflit (409)
class ConflictError extends AppError {
  constructor(message = 'Conflit de ressource') {
    super(message, 409, 'CONFLICT');
  }
}

// Trop de requêtes (429)
class RateLimitError extends AppError {
  constructor(message = 'Trop de requêtes') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// Erreur serveur (500)
class ServerError extends AppError {
  constructor(message = 'Erreur serveur interne') {
    super(message, 500, 'SERVER_ERROR');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError
};