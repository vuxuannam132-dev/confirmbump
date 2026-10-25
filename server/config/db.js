const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let isPg = false;
let isNeon = false;
let neonSql = null;
let pgPool = null;
let sqliteDb = null;

// Determine if we should use PostgreSQL
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
  isPg = true;

  // 1. Initialize Neon Serverless HTTP Driver if hosted on neon.tech
  if (databaseUrl.includes('neon.tech')) {
    isNeon = true;
    try {
      const { neon } = require('@neondatabase/serverless');
      neonSql = neon(databaseUrl, {
        fullResults: true,
        fetchOptions: {
          cache: 'no-store'
        }
      });
      console.log('⚡ Neon Serverless HTTP Driver khởi tạo thành công...');
    } catch (e) {
      console.warn('⚠️ Không thể nạp @neondatabase/serverless:', e.message);
    }
  }

  // 2. Initialize pg.Pool as robust fallback or primary PostgreSQL driver
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      },
      max: 2,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000
    });
    pgPool.on('error', (err) => {
      console.warn('⚠️ pgPool idle client warning:', err.message);
    });
    console.log('🐘 PostgreSQL Pool đã sẵn sàng...');
  } catch (e) {
    console.warn('⚠️ Không thể nạp pg.Pool:', e.message);
  }
} else {
  // Fallback to SQLite (local development)
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = process.env.VERCEL 
    ? path.join('/tmp', 'database.sqlite') 
    : path.join(__dirname, '..', 'database.sqlite');

  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  console.log(`📦 Sử dụng SQLite tại: ${dbPath}`);
}

/**
 * Convert query with ? placeholders into $1, $2 for PostgreSQL
 */
function translateQuery(sql) {
  if (!isPg) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

/**
 * Execute query across Neon HTTP driver with retry and automatic pg.Pool fallback
 */
async function executePgQuery(sql, params = [], retries = 2) {
  const q = translateQuery(sql);

  if (isNeon && neonSql) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await neonSql.query(q, params);
        return res;
      } catch (err) {
        const isNetworkErr = err?.name === 'TypeError' || 
                             err?.message?.includes('fetch failed') || 
                             err?.message?.includes('timeout') ||
                             err?.message?.includes('undici');
        if (isNetworkErr && attempt < retries) {
          console.warn(`[Neon Driver] Thử lại lần ${attempt + 1}/${retries} do: "${err.message}"`);
          await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }

        // Automatic fallback to pgPool if Neon HTTP fetch fails
        if (pgPool) {
          console.warn(`[Neon Fallback -> pgPool] Chuyển truy vấn sang pgPool: ${err.message}`);
          return await pgPool.query(q, params);
        }
        throw err;
      }
    }
  }

  if (pgPool) {
    return await pgPool.query(q, params);
  }

  throw new Error('Không có driver PostgreSQL khả dụng.');
}

const db = {
  isPg,

  async get(sql, params = []) {
    if (isPg) {
      const res = await executePgQuery(sql, params);
      const rows = res.rows || (Array.isArray(res) ? res : []);
      return rows[0] || null;
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.get(...params) || null;
    }
  },

  async all(sql, params = []) {
    if (isPg) {
      const res = await executePgQuery(sql, params);
      return res.rows || (Array.isArray(res) ? res : []);
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.all(...params);
    }
  },

  async run(sql, params = []) {
    if (isPg) {
      let q = sql;
      if (/^\s*insert\s+/i.test(q) && !/returning\s+/i.test(q)) {
        q += ' RETURNING id';
      }
      const res = await executePgQuery(q, params);
      const rows = res.rows || (Array.isArray(res) ? res : []);
      const lastInsertRowid = rows[0]?.id || null;
      return { lastInsertRowid, changes: res.rowCount !== undefined ? res.rowCount : rows.length };
    } else {
      const stmt = sqliteDb.prepare(sql);
      const res = stmt.run(...params);
      return { lastInsertRowid: res.lastInsertRowid, changes: res.changes };
    }
  },

  async exec(sql) {
    if (isPg) {
      return await executePgQuery(sql);
    } else {
      return sqliteDb.exec(sql);
    }
  }
};

// Official Admin Credentials
const OFFICIAL_ADMIN_USERNAME = 'admin_BCH_doantruongdkhbt';
const OFFICIAL_ADMIN_PASSWORD_HASH = bcrypt.hashSync('DOANKETXUNGDANG2026@*', 10);

let isInitialized = false;
let initializingPromise = null;

async function initDb() {
  if (isInitialized) return;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    try {
      if (isPg) {
        // Create tables one by one for Postgres/Neon
        await db.exec(`
          CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(20) DEFAULT '#2563EB'
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS email_otps (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            facebook_url TEXT NOT NULL,
            phone VARCHAR(50),
            role VARCHAR(50) NOT NULL DEFAULT 'USER',
            department_id INTEGER REFERENCES departments(id),
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
            avatar_url TEXT,
            two_factor_enabled INTEGER DEFAULT 0,
            two_factor_method VARCHAR(50) DEFAULT 'EMAIL',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS login_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_id VARCHAR(100),
            device_name VARCHAR(100),
            os_name VARCHAR(50),
            browser_name VARCHAR(50),
            ip_address VARCHAR(100),
            location_text VARCHAR(100) DEFAULT 'Việt Nam',
            is_trusted INTEGER DEFAULT 0,
            is_online INTEGER DEFAULT 1,
            last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS two_factor_challenges (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            challenge_token VARCHAR(100) UNIQUE NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            method VARCHAR(50) DEFAULT 'EMAIL',
            device_info TEXT,
            is_verified INTEGER DEFAULT 0,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            platform VARCHAR(50) NOT NULL,
            post_url TEXT NOT NULL,
            target_department_id INTEGER REFERENCES departments(id),
            created_by INTEGER NOT NULL REFERENCES users(id),
            deadline TIMESTAMPTZ NOT NULL,
            makeup_deadline TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS confirm_submissions (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            note TEXT,
            is_makeup INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'PENDING',
            admin_feedback TEXT,
            reviewed_by INTEGER REFERENCES users(id),
            reviewed_at TIMESTAMPTZ,
            submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            endpoint TEXT UNIQUE NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            target_role VARCHAR(50),
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            type VARCHAR(50) NOT NULL,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } else {
        // SQLite schema
        sqliteDb.exec(`
          CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#2563EB'
          );

          CREATE TABLE IF NOT EXISTS email_otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            facebook_url TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'USER',
            department_id INTEGER REFERENCES departments(id),
            status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
            avatar_url TEXT,
            two_factor_enabled INTEGER DEFAULT 0,
            two_factor_method TEXT DEFAULT 'EMAIL',
            created_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS login_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_id TEXT,
            device_name TEXT,
            os_name TEXT,
            browser_name TEXT,
            ip_address TEXT,
            location_text TEXT DEFAULT 'Việt Nam',
            is_trusted INTEGER DEFAULT 0,
            is_online INTEGER DEFAULT 1,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS two_factor_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            challenge_token TEXT UNIQUE NOT NULL,
            otp_code TEXT NOT NULL,
            method TEXT DEFAULT 'EMAIL',
            device_info TEXT,
            is_verified INTEGER DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            platform TEXT NOT NULL,
            post_url TEXT NOT NULL,
            target_department_id INTEGER,
            created_by INTEGER NOT NULL REFERENCES users(id),
            deadline DATETIME NOT NULL,
            makeup_deadline DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (target_department_id) REFERENCES departments(id)
          );

          CREATE TABLE IF NOT EXISTS confirm_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            note TEXT,
            is_makeup INTEGER DEFAULT 0,
            status TEXT DEFAULT 'PENDING',
            admin_feedback TEXT,
            reviewed_by INTEGER REFERENCES users(id),
            reviewed_at DATETIME,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            endpoint TEXT UNIQUE NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            target_role TEXT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            type TEXT NOT NULL,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }

      // Check and alter users table to add new security columns if not exists
      const alterCols = [
        { name: 'avatar_url', pgType: 'TEXT', sqliteType: 'TEXT' },
        { name: 'two_factor_enabled', pgType: 'INTEGER DEFAULT 0', sqliteType: 'INTEGER DEFAULT 0' },
        { name: 'two_factor_method', pgType: "VARCHAR(50) DEFAULT 'EMAIL'", sqliteType: "TEXT DEFAULT 'EMAIL'" }
      ];

      for (const col of alterCols) {
        try {
          if (isPg) {
            await db.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.pgType};`);
          } else {
            try {
              sqliteDb.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.sqliteType};`);
            } catch (e) {
              // Column might already exist in SQLite
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      // Optional indexes for performance
      try {
        if (isPg) {
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_2fa_challenges_token ON two_factor_challenges(challenge_token);`);
        } else {
          sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);`);
          sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_2fa_challenges_token ON two_factor_challenges(challenge_token);`);
        }
      } catch (idxErr) {
        // Ignore index errors
      }

      // Ensure 4 official departments exist
      const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
      const count = parseInt(deptCount?.count || 0);

      if (count === 0) {
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['TRUYEN_THONG', 'Ban Truyền thông', '#2563EB']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['THIET_KE', 'Ban Thiết kế', '#D97706']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['NHAN_SU', 'Ban Nhân sự', '#DC2626']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['HAU_CAN', 'Ban Hậu cần', '#059669']);
        console.log('✅ Khởi tạo 4 phân ban Đoàn trường thành công!');
      }

      // Ensure official Super Admin exists
      const officialAdmin = await db.get('SELECT id FROM users WHERE username = ?', [OFFICIAL_ADMIN_USERNAME]);
      if (!officialAdmin) {
        const ttDept = await db.get("SELECT id FROM departments WHERE code = 'TRUYEN_THONG'");
        const deptId = ttDept?.id || 1;

        await db.run(`
          INSERT INTO users (username, password_hash, full_name, email, facebook_url, phone, role, department_id, status)
          VALUES (?, ?, ?, ?, ?, ?, 'ADMIN_TONG', ?, 'ACTIVE')
        `, [
          OFFICIAL_ADMIN_USERNAME,
          OFFICIAL_ADMIN_PASSWORD_HASH,
          'Ban Chấp Hành Đoàn Trường (Admin Tổng)',
          'bch.doantruong@dkhbt.edu.vn',
          'https://facebook.com/doantruong.dkhbt',
          '0988111222',
          deptId
        ]);
        console.log(`✅ Khởi tạo tài khoản Admin Tổng chính thức: ${OFFICIAL_ADMIN_USERNAME}`);
      } else {
        await db.run('UPDATE users SET password_hash = ? WHERE username = ?', [OFFICIAL_ADMIN_PASSWORD_HASH, OFFICIAL_ADMIN_USERNAME]);
      }

      isInitialized = true;
      console.log('✅ Khởi tạo cơ sở dữ liệu hoàn tất!');
    } catch (err) {
      initializingPromise = null; // Reset so subsequent requests can retry!
      console.error('❌ Lỗi khởi tạo Database:', err);
      throw err;
    }
  })();

  return initializingPromise;
}

initDb().catch(e => console.error('initDb error:', e));

module.exports = db;
module.exports.initDb = initDb;
