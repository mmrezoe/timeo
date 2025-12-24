// Load environment variables from project root .env so DATABASE_URL is available
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
