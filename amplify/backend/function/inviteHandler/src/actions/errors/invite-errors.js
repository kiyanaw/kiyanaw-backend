/**
 * Custom Error Classes for Invite System
 * 
 * Provides structured error handling with proper HTTP status codes
 */

/**
 * Base class for all invite-related errors
 */
class InviteError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation errors - 400 status
 */
class ValidationError extends InviteError {
  constructor(message) {
    super(message, 400);
  }
}

/**
 * Business logic conflicts - 409 status
 */
class ConflictError extends InviteError {
  constructor(message) {
    super(message, 409);
  }
}

/**
 * External service failures - 502 status
 */
class ServiceError extends InviteError {
  constructor(message, originalError = null) {
    super(message, 502);
    this.originalError = originalError;
  }
}

/**
 * Resource not found - 404 status
 */
class NotFoundError extends InviteError {
  constructor(message) {
    super(message, 404);
  }
}

/**
 * Internal server errors - 500 status
 */
class InternalError extends InviteError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

module.exports = {
  InviteError,
  ValidationError,
  ConflictError,
  ServiceError,
  NotFoundError,
  InternalError
}; 