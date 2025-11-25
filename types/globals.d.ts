/**
 * Clerk type extensions for custom session claims
 * 
 * To use this, configure your Clerk Dashboard session token to include:
 * {
 *   "metadata": "{{user.public_metadata}}"
 * }
 * 
 * This maps user.publicMetadata to sessionClaims.metadata
 */

export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: 'admin' | 'user';
    };
  }
}
