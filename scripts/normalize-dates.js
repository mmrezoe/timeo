/**
 * Script to normalize all GoalDayStatus dates to app "day" midnight
 * (based on APP_TIMEZONE from .env, defaulting to UTC).
 *
 * This fixes dates that were stored before the normalization fix
 * 
 * Usage: node scripts/normalize-dates.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { normalizeToUTCMidnight } = require('../lib/dates');

const prisma = new PrismaClient();

async function normalizeDates() {
  console.log('Starting date normalization...');

  try {
    // Get all GoalDayStatus entries
    const allStatuses = await prisma.goalDayStatus.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${allStatuses.length} entries to check`);

    // Group by goalId and normalized date to find duplicates
    const normalizedMap = new Map();
    const duplicates = [];
    const toUpdate = [];

    for (const status of allStatuses) {
      const normalizedDate = normalizeToUTCMidnight(status.date);
      const dateKey = `${status.goalId}_${normalizedDate.toISOString().split('T')[0]}`;

      // Check if date needs normalization
      const needsNormalization = status.date.getTime() !== normalizedDate.getTime();

      if (!normalizedMap.has(dateKey)) {
        normalizedMap.set(dateKey, {
          original: status,
          normalized: normalizedDate,
          needsUpdate: needsNormalization
        });
      } else {
        // Duplicate found
        const existing = normalizedMap.get(dateKey);
        duplicates.push({
          goalId: status.goalId,
          date: status.date,
          normalizedDate: normalizedDate,
          existing: existing.original
        });

        // Keep the one with higher minutes, or more recent if equal
        if (status.minutes > existing.original.minutes ||
          (status.minutes === existing.original.minutes && status.date > existing.original.date)) {
          normalizedMap.set(dateKey, {
            original: status,
            normalized: normalizedDate,
            needsUpdate: needsNormalization || existing.needsUpdate
          });
          // Mark old one for deletion
          toUpdate.push({
            id: existing.original.id,
            action: 'delete'
          });
        } else {
          // Mark current one for deletion
          toUpdate.push({
            id: status.id,
            action: 'delete'
          });
        }
      }

      // If needs normalization and not a duplicate, mark for update
      if (needsNormalization && !duplicates.some(d => d.date.getTime() === status.date.getTime())) {
        toUpdate.push({
          id: status.id,
          action: 'update',
          normalizedDate: normalizedDate
        });
      }
    }

    console.log(`Found ${duplicates.length} duplicate entries`);
    console.log(`Found ${toUpdate.filter(u => u.action === 'update').length} entries that need date normalization`);
    console.log(`Found ${toUpdate.filter(u => u.action === 'delete').length} duplicate entries to delete`);

    if (toUpdate.length === 0) {
      console.log('No updates needed. All dates are already normalized.');
      return;
    }

    // Ask for confirmation (in production, you might want to add a --force flag)
    console.log('\nThis will:');
    console.log(`- Update ${toUpdate.filter(u => u.action === 'update').length} entries with normalized dates`);
    console.log(`- Delete ${toUpdate.filter(u => u.action === 'delete').length} duplicate entries`);
    console.log('\nProceeding with updates...\n');

    // Process updates and deletes in transactions
    let updated = 0;
    let deleted = 0;

    for (const update of toUpdate) {
      try {
        if (update.action === 'update') {
          await prisma.goalDayStatus.update({
            where: { id: update.id },
            data: { date: update.normalizedDate }
          });
          updated++;
        } else if (update.action === 'delete') {
          await prisma.goalDayStatus.delete({
            where: { id: update.id }
          });
          deleted++;
        }
      } catch (error) {
        console.error(`Error processing entry ${update.id}:`, error.message);
      }
    }

    console.log(`\n✅ Normalization complete!`);
    console.log(`- Updated: ${updated} entries`);
    console.log(`- Deleted: ${deleted} duplicate entries`);

  } catch (error) {
    console.error('Error during normalization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
normalizeDates()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
