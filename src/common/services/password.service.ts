import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Password Service
 * 
 * Provides secure password hashing and verification using Argon2id.
 * Argon2id is the recommended variant as it provides a balance between
 * resistance to side-channel attacks and GPU-based attacks.
 * 
 * Configuration:
 * - type: argon2id (best balance of security)
 * - memoryCost: 65536 KB (64 MB) - configurable via env
 * - timeCost: 3 iterations - configurable via env
 * - parallelism: 4 threads - configurable via env
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  /**
   * Hash a password using Argon2id
   * 
   * @param password Plain text password
   * @returns Hashed password string
   */
  async hash(password: string): Promise<string> {
    try {
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10), // 64 MB default
        timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10), // 3 iterations default
        parallelism: parseInt(process.env.ARGON2_PARALLELISM || '4', 10), // 4 threads default
        hashLength: 32, // 32 bytes output
      });

      this.logger.debug('Password hashed successfully');
      return hash;
    } catch (error) {
      this.logger.error(`Failed to hash password: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify a password against a hash
   * 
   * @param hash Hashed password string
   * @param password Plain text password to verify
   * @returns True if password matches, false otherwise
   */
  async verify(hash: string, password: string): Promise<boolean> {
    try {
      const isValid = await argon2.verify(hash, password);
      
      if (!isValid) {
        this.logger.debug('Password verification failed');
      } else {
        this.logger.debug('Password verified successfully');
      }
      
      return isValid;
    } catch (error) {
      this.logger.error(`Failed to verify password: ${error.message}`, error.stack);
      // Return false on error to prevent timing attacks
      return false;
    }
  }

  /**
   * Check if a hash needs to be rehashed (e.g., after algorithm upgrade)
   * 
   * @param hash Hashed password string
   * @returns True if hash needs to be rehashed
   */
  needsRehash(hash: string): boolean {
    try {
      // Check if hash uses old algorithm (bcrypt) or outdated Argon2 parameters
      if (hash.startsWith('$2')) {
        // BCrypt hash - needs rehash
        return true;
      }

      // Check Argon2 parameters
      const parts = hash.split('$');
      if (parts.length < 4) {
        return true;
      }

      // Parse Argon2 parameters: $argon2id$v=19$m=65536,t=3,p=4$...
      const params = parts[3];
      const memoryMatch = params.match(/m=(\d+)/);
      const timeMatch = params.match(/t=(\d+)/);
      const parallelismMatch = params.match(/p=(\d+)/);

      if (!memoryMatch || !timeMatch || !parallelismMatch) {
        return true;
      }

      const memory = parseInt(memoryMatch[1], 10);
      const time = parseInt(timeMatch[1], 10);
      const parallelism = parseInt(parallelismMatch[1], 10);

      const currentMemory = parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10);
      const currentTime = parseInt(process.env.ARGON2_TIME_COST || '3', 10);
      const currentParallelism = parseInt(process.env.ARGON2_PARALLELISM || '4', 10);

      // Rehash if parameters are outdated
      return (
        memory < currentMemory ||
        time < currentTime ||
        parallelism < currentParallelism
      );
    } catch (error) {
      this.logger.warn(`Failed to check if hash needs rehash: ${error.message}`);
      // If we can't determine, assume it needs rehash for safety
      return true;
    }
  }
}

