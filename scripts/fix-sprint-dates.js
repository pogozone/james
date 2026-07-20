const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/james-todos';

function getBerlinWeekBoundaries(date) {
  const d = new Date(date);
  const berlin = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(d);
  const [y, m, day] = berlin.split('-').map(Number);
  const localSunday = new Date(Date.UTC(y, m - 1, day));
  const dayOfWeek = localSunday.getUTCDay();
  const start = new Date(localSunday);
  start.setUTCDate(localSunday.getUTCDate() - dayOfWeek);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const fmt = (dt) => {
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  return { start: fmt(start), end: fmt(end) };
}

(async () => {
  await mongoose.connect(MONGODB_URI);

  const Sprint = mongoose.connection.collection('sprints');
  const now = new Date();
  const { start, end } = getBerlinWeekBoundaries(now);

  const sprint1 = await Sprint.findOne({ number: 1 });

  if (!sprint1) {
    console.log('Sprint 1 not found');
    await mongoose.disconnect();
    return;
  }

  await Sprint.updateOne(
    { _id: sprint1._id },
    { $set: { startDate: start, endDate: end, status: 'current', closedAt: null } }
  );

  await Sprint.updateMany(
    { _id: { $ne: sprint1._id }, status: 'current' },
    { $set: { status: 'future' } }
  );

  console.log(`Sprint 1 updated: ${start} - ${end} (current)`);
  await mongoose.disconnect();
})();
