const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/james-todos';

(async () => {
  await mongoose.connect(MONGODB_URI);
  const Sprint = mongoose.connection.collection('sprints');

  // Reset Sprint 1 to the requested dates and status
  await Sprint.updateOne(
    { number: 1 },
    {
      $set: {
        startDate: '2026-07-12',
        endDate: '2026-07-18',
        status: 'current'
      },
      $unset: { closedAt: 1 }
    }
  );

  // Upsert Sprint 2 as next sprint
  await Sprint.updateOne(
    { number: 2 },
    {
      $set: {
        startDate: '2026-07-19',
        endDate: '2026-07-25',
        status: 'next'
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  // Upsert Sprint 3 as future sprint
  await Sprint.updateOne(
    { number: 3 },
    {
      $set: {
        startDate: '2026-07-26',
        endDate: '2026-08-01',
        status: 'future'
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  // Remove any additional sprints to avoid conflicts
  await Sprint.deleteMany({ number: { $nin: [1, 2, 3] } });

  console.log('Sprint 1: 2026-07-12 - 2026-07-18 (current)');
  console.log('Sprint 2: 2026-07-19 - 2026-07-25 (next)');
  console.log('Sprint 3: 2026-07-26 - 2026-08-01 (future)');
  await mongoose.disconnect();
})();
