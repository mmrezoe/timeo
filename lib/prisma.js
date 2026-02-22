// Load environment variables from project root .env so DATABASE_URL is available
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client configuration for multi-server, timezone-independent operations
 * 
 * Best practices:
 * - All dates are stored in UTC
 * - Connection pooling is handled by Prisma
 * - Transaction isolation level: READ COMMITTED (default for SQLite)
 * - Logging: Only errors in production
 */
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'production'
        ? ['error']
        : ['query', 'error', 'warn'],
    // SQLite doesn't support connection pooling, but this ensures proper configuration
    // For PostgreSQL/MySQL in production, configure connection pool in DATABASE_URL
    // Example: postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
});

/**
 * Execute a transaction with proper error handling
 * @param {Function} callback - Transaction callback function
 * @param {Object} options - Transaction options
 * @returns {Promise} Transaction result
 */
async function transaction(callback, options = {}) {
    // SQLite supports transactions but with limitations
    // For production with multiple servers, consider PostgreSQL with proper isolation levels
    try {
        return await prisma.$transaction(callback, {
            timeout: options.timeout || 5000, // 5 seconds default
            isolationLevel: options.isolationLevel || 'ReadCommitted', // SQLite default
            ...options
        });
    } catch (error) {
        console.error('Transaction error:', error);
        throw error;
    }
}

/**
 * Health check for database connection
 * @returns {Promise<boolean>} True if connection is healthy
 */
async function healthCheck() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = prisma;
module.exports.transaction = transaction;
module.exports.healthCheck = healthCheck;