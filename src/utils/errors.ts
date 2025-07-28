// PATH: src/utils/errors.js

/**
 * Classe de base pour toutes les erreurs custom
 */
class AppError extends Error {
  constructor(message, statusCode, code, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

/**
 * Erreurs de validation (400)
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

/**
 * Erreurs d'authentification (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

class InvalidTokenError extends AuthenticationError {
  constructor(message = 'Invalid or expired token') {
    super(message);
    this.code = 'INVALID_TOKEN';
  }
}

/**
 * Erreurs d'autorisation (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

class QuotaExceededError extends AuthorizationError {
  constructor(quotaType, limit, usage) {
    super(`Quota exceeded for ${quotaType}`);
    this.code = 'QUOTA_EXCEEDED';
    this.details = { quotaType, limit, usage };
  }
}

/**
 * Erreurs de ressource non trouvée (404)
 */
class NotFoundError extends AppError {
  constructor(resource, id = null) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', true, { resource, id });
  }
}

/**
 * Erreurs serveur (500+)
 */
class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, 'INTERNAL_ERROR', false, details);
  }
}

class DatabaseError extends InternalServerError {
  constructor(operation, error) {
    super(`Database error during ${operation}`);
    this.code = 'DATABASE_ERROR';
    this.details = { 
      operation,
      message: error.message 
    };
  }
}

/**
 * Helper pour vérifier si une erreur est opérationnelle
 */
const isOperationalError = (error) => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Helper pour convertir une erreur native en AppError
 */
const normalizeError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  // Erreurs JWT
  if (error.name === 'JsonWebTokenError') {
    return new InvalidTokenError(error.message);
  }

  // Erreur générique
  return new InternalServerError(error.message || 'Unknown error', {
    originalError: error.toString(),
    stack: error.stack
  });
};

/**
 * Wrapper pour les fonctions async dans les controllers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  InvalidTokenError,
  AuthorizationError,
  QuotaExceededError,
  NotFoundError,
  InternalServerError,
  DatabaseError,
  isOperationalError,
  normalizeError,
  asyncHandler
};