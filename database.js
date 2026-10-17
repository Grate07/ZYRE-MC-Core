const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function requiredXpForLevel(level) {
  return 5 * level ** 2 + 50 * level + 100;
}

function createDatabase(databasePath) {
  const absolutePath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const db = new Database(absolutePath);

  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS levels (
      userId TEXT PRIMARY KEY,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      totalXp INTEGER NOT NULL DEFAULT 0,
      lastXpTime INTEGER NOT NULL DEFAULT 0
    )
  `);

  const statements = {
    get: db.prepare(
      'SELECT userId, xp, level, totalXp, lastXpTime FROM levels WHERE userId = ?',
    ),
    insert: db.prepare(
      'INSERT OR IGNORE INTO levels (userId, xp, level, totalXp, lastXpTime) VALUES (?, 0, 0, 0, 0)',
    ),
    update: db.prepare(
      'UPDATE levels SET xp = ?, level = ?, totalXp = ?, lastXpTime = ? WHERE userId = ?',
    ),
    leaderboard: db.prepare(
      'SELECT userId, xp, level, totalXp FROM levels ORDER BY totalXp DESC, level DESC, userId ASC LIMIT ? OFFSET ?',
    ),
    count: db.prepare('SELECT COUNT(*) AS count FROM levels'),
    rank: db.prepare(
      `SELECT COUNT(*) + 1 AS rank
       FROM levels
       WHERE totalXp > ?
          OR (totalXp = ? AND level > ?)
          OR (totalXp = ? AND level = ? AND userId < ?)`,
    ),
    allForExport: db.prepare(
      'SELECT userId, xp, level, totalXp FROM levels ORDER BY totalXp DESC, level DESC, userId ASC',
    ),
  };

  const awardTransaction = db.transaction((userId, now, settings) => {
    statements.insert.run(userId);
    const current = statements.get.get(userId);
    if (!current) throw new Error(`Could not create level record for ${userId}.`);

    const elapsed = now - current.lastXpTime;
    if (elapsed <= settings.cooldownSeconds) {
      return {
        awarded: false,
        amount: 0,
        remainingSeconds: Math.max(0, settings.cooldownSeconds - elapsed + 1),
        record: current,
      };
    }

    const amount =
      Math.floor(Math.random() * (settings.maxXp - settings.minXp + 1)) + settings.minXp;
    let xp = current.xp + amount;
    let level = current.level;
    let levelledUp = false;
    let threshold = requiredXpForLevel(level);

    // Reset the current-level progress on each level-up, as requested.
    while (xp >= threshold) {
      xp = 0;
      level += 1;
      levelledUp = true;
      threshold = requiredXpForLevel(level);
    }

    // totalXp records each earned point once, including points that complete a level.
    const totalXp = current.totalXp + amount;
    statements.update.run(xp, level, totalXp, now, userId);

    return {
      awarded: true,
      amount,
      levelledUp,
      previousLevel: current.level,
      requiredXp: requiredXpForLevel(current.level),
      nextRequiredXp: threshold,
      record: { userId, xp, level, totalXp, lastXpTime: now },
    };
  });

  return {
    getLevel(userId) {
      statements.insert.run(userId);
      return statements.get.get(userId);
    },
    awardXp(userId, now, settings) {
      return awardTransaction(userId, now, settings);
    },
    getLeaderboard(page, pageSize) {
      const count = statements.count.get().count;
      const pageCount = Math.max(1, Math.ceil(count / pageSize));
      const safePage = Math.min(Math.max(0, page), pageCount - 1);
      return {
        entries: statements.leaderboard.all(pageSize, safePage * pageSize),
        page: safePage,
        pageCount,
        totalUsers: count,
      };
    },
    getRank(userId) {
      const record = this.getLevel(userId);
      return statements.rank.get(
        record.totalXp,
        record.totalXp,
        record.level,
        record.totalXp,
        record.level,
        userId,
      ).rank;
    },
    getAllLevels() {
      return statements.allForExport.all();
    },
    close() {
      db.close();
    },
  };
}

module.exports = { createDatabase, requiredXpForLevel };
