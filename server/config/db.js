const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let isPg = false;
let pool = null;
let sqliteDb = null;

// Determine if we should use PostgreSQL (Neon, Supabase, Vercel Postgres)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
  isPg = true;
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  console.log('🐘 Đang kết nối Cơ sở dữ liệu Cloud PostgreSQL (Neon / Supabase)...');
} else {
  // Fallback to SQLite (on Vercel Serverless, use /tmp which is writable)
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = process.env.VERCEL 
    ? path.join('/tmp', 'database.sqlite') 
    : path.join(__dirname, '..', 'database.sqlite');

  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  console.log(`📦 Đang sử dụng SQLite tại: ${dbPath}`);
}

/**
 * Convert query with ? placeholders into $1, $2 for PostgreSQL
 */
function translateQuery(sql) {
  if (!isPg) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

const db = {
  isPg,

  async get(sql, params = []) {
    if (isPg) {
      const q = translateQuery(sql);
      const res = await pool.query(q, params);
      return res.rows[0] || null;
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.get(...params) || null;
    }
  },

  async all(sql, params = []) {
    if (isPg) {
      const q = translateQuery(sql);
      const res = await pool.query(q, params);
      return res.rows;
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.all(...params);
    }
  },

  async run(sql, params = []) {
    if (isPg) {
      let q = translateQuery(sql);
      if (/^\s*insert\s+/i.test(q) && !/returning\s+/i.test(q)) {
        q += ' RETURNING id';
      }
      const res = await pool.query(q, params);
      const lastInsertRowid = res.rows[0]?.id || null;
      return { lastInsertRowid, changes: res.rowCount };
    } else {
      const stmt = sqliteDb.prepare(sql);
      const res = stmt.run(...params);
      return { lastInsertRowid: res.lastInsertRowid, changes: res.changes };
    }
  },

  async exec(sql) {
    if (isPg) {
      return await pool.query(sql);
    } else {
      return sqliteDb.exec(sql);
    }
  }
};

// Official Admin Credentials
const OFFICIAL_ADMIN_USERNAME = 'admin_BCH_doantruongdkhbt';
const OFFICIAL_ADMIN_PASSWORD_HASH = bcrypt.hashSync('DOANKETXUNGDANG2026@*', 10);

let initPromise = null;
async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (isPg) {
        // PostgreSQL schema tables
        await db.exec(`
          CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(20) DEFAULT '#2563EB'
          );

          CREATE TABLE IF NOT EXISTS email_otps (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

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
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

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
      } else {
        // SQLite schema tables
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
            created_by INTEGER REFERENCES users(id),
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
        `);
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
        // Update password to ensure it matches DOANKETXUNGDANG2026@*
        await db.run('UPDATE users SET password_hash = ? WHERE username = ?', [OFFICIAL_ADMIN_PASSWORD_HASH, OFFICIAL_ADMIN_USERNAME]);
      }

      // Delete dependencies first, then old test users
      await db.run('DELETE FROM confirm_submissions');
      await db.run('DELETE FROM tasks');
      await db.run('DELETE FROM email_otps');
      await db.run(`
        DELETE FROM users 
        WHERE username != ?
      `, [OFFICIAL_ADMIN_USERNAME]);

    } catch (err) {
      console.error('❌ Lỗi khởi tạo Database:', err);
      throw err;
    }
  })();

  return initPromise;
}

// Auto init
initDb().catch(e => console.error('initDb error:', e));

module.exports = db;
module.exports.initDb = initDb;
