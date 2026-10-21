const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let isPg = false;
let pool = null;
let sqliteDb = null;

// Determine if we should use PostgreSQL (e.g. Neon, Supabase, Vercel Postgres)
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
  // Fallback to local SQLite for localhost
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  console.log('📦 Đang sử dụng Cơ sở dữ liệu SQLite cục bộ (database.sqlite)...');
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
      // For INSERT, append RETURNING id if not present to capture inserted ID
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

// Initialize DB schema & default seeds
let initPromise = null;
async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (isPg) {
        // PostgreSQL schema
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
        // SQLite schema
        db.exec(`
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

      // Check if departments need seeding
      const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
      const count = parseInt(deptCount?.count || 0);

      if (count === 0) {
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['TRUYEN_THONG', 'Ban Truyền thông', '#2563EB']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['THIET_KE', 'Ban Thiết kế', '#D97706']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['NHAN_SU', 'Ban Nhân sự', '#DC2626']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['HAU_CAN', 'Ban Hậu cần', '#059669']);
        console.log('✅ Khởi tạo 4 phân ban Đoàn trường thành công!');
      }

      // Check if Admin Tổng exists, if not seed default admin
      const adminExists = await db.get("SELECT id FROM users WHERE username = 'admin'");
      if (!adminExists) {
        const salt = bcrypt.genSaltSync(10);
        const adminPass = bcrypt.hashSync('admin123', salt);
        const ttDept = await db.get("SELECT id FROM departments WHERE code = 'TRUYEN_THONG'");
        const deptId = ttDept?.id || 1;

        const resAdmin = await db.run(`
          INSERT INTO users (username, password_hash, full_name, email, facebook_url, phone, role, department_id, status)
          VALUES (?, ?, ?, ?, ?, ?, 'ADMIN_TONG', ?, 'ACTIVE')
        `, [
          'admin',
          adminPass,
          'Đồng chí Bí Thư (Admin Tổng)',
          'admin@doantruong.edu.vn',
          'https://facebook.com/admin.doantruong',
          '0988111222',
          deptId
        ]);

        const adminId = resAdmin.lastInsertRowid;

        // Also seed the 4 Admin Cấp 2 for ready-to-test cloud setup
        const depts = await db.all("SELECT id, code FROM departments");
        const deptMap = {};
        depts.forEach(d => deptMap[d.code] = d.id);

        const a2List = [
          { u: 'admin_truyenthong', n: 'Trưởng Ban Truyền Thông', e: 'truyenthong@doantruong.edu.vn', fb: 'https://facebook.com/truyenthong.doan', d: deptMap['TRUYEN_THONG'] },
          { u: 'admin_thietke', n: 'Trưởng Ban Thiết Kế', e: 'thietke@doantruong.edu.vn', fb: 'https://facebook.com/thietke.doan', d: deptMap['THIET_KE'] },
          { u: 'admin_nhansu', n: 'Trưởng Ban Nhân Sự', e: 'nhansu@doantruong.edu.vn', fb: 'https://facebook.com/nhansu.doan', d: deptMap['NHAN_SU'] },
          { u: 'admin_haucan', n: 'Trưởng Ban Hậu Cần', e: 'haucan@doantruong.edu.vn', fb: 'https://facebook.com/haucan.doan', d: deptMap['HAU_CAN'] }
        ];

        for (const a of a2List) {
          await db.run(`
            INSERT INTO users (username, password_hash, full_name, email, facebook_url, role, department_id, status, created_by)
            VALUES (?, ?, ?, ?, ?, 'ADMIN_CAP_2', ?, 'ACTIVE', ?)
          `, [a.u, adminPass, a.n, a.e, a.fb, a.d, adminId]);
        }

        console.log('✅ Tự động khởi tạo tài khoản Admin Tổng & 4 Admin Cấp 2 sẵn sàng sử dụng!');
      }
    } catch (err) {
      console.error('❌ Lỗi khởi tạo Database:', err);
    }
  })();

  return initPromise;
}

// Auto init
initDb();

module.exports = db;
module.exports.initDb = initDb;
