// LMS API — single-file Express backend (Phase 1: auth foundation).
// Deliberately kept in one file for simple upload/deploy on shared hosting (Hostinger, no Docker).

require('dotenv').config({ quiet: true })

const express = require('express')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const crypto = require('crypto')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 4000
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m'
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7)
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')

for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[key]) {
    console.error(`Missing required env var ${key}. Copy .env.example to .env and fill it in.`)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// DB pool
// ---------------------------------------------------------------------------

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.full_name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  )
}

function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

async function storeRefreshToken(userId, tokenHash) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  )
}

function setRefreshCookie(res, rawToken) {
  res.cookie('refresh_token', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  })
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing access token' })

  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Content/file/join links are stored as plain URLs (no multipart upload handling on this single-process
// backend — see the SRS storage-adapter note). Restrict to http(s) so a stored value can never become a
// javascript:/data: URI that executes when an admin, trainer, or student clicks it.
const SAFE_URL_RE = /^https:\/\/[^\s]+$/i

function isSafeUrl(url) {
  if (typeof url !== 'string' || url.length > 2000) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && SAFE_URL_RE.test(url)
  } catch {
    return false
  }
}

async function nextSortOrder(table, column, id) {
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${table} WHERE ${column} = ?`,
    [id]
  )
  return rows[0].next
}

// trainer: has a batch on this course. student: has an active enrollment on a batch of this course.
async function hasCourseAccess(user, courseId) {
  if (user.role === 'admin') return true

  if (user.role === 'trainer') {
    const [rows] = await pool.query(
      'SELECT 1 FROM batches WHERE course_id = ? AND trainer_id = ? LIMIT 1',
      [courseId, user.sub]
    )
    return rows.length > 0
  }

  const [rows] = await pool.query(
    `SELECT 1 FROM enrollments e
     JOIN batches b ON b.id = e.batch_id
     WHERE b.course_id = ? AND e.student_id = ? AND e.status = 'active'
     LIMIT 1`,
    [courseId, user.sub]
  )
  return rows.length > 0
}

// trainer: assigned to the batch that owns this module. admin: always.
async function canEditModule(user, moduleId) {
  if (user.role === 'admin') return true
  const [rows] = await pool.query(
    `SELECT 1 FROM modules m
     JOIN batches b ON b.course_id = m.course_id
     WHERE m.id = ? AND b.trainer_id = ?
     LIMIT 1`,
    [moduleId, user.sub]
  )
  return rows.length > 0
}

// access to a single lesson: same rule as course access, resolved via the lesson's module/course.
async function canAccessLesson(user, lessonId) {
  const [rows] = await pool.query(
    `SELECT m.course_id AS course_id FROM lessons l
     JOIN modules m ON m.id = l.module_id
     WHERE l.id = ? LIMIT 1`,
    [lessonId]
  )
  if (!rows[0]) return false
  return hasCourseAccess(user, rows[0].course_id)
}

// trainer: assigned directly to this batch. admin: always. (used for live sessions / attendance)
async function canManageBatch(user, batchId) {
  if (user.role === 'admin') return true
  const [rows] = await pool.query(
    'SELECT 1 FROM batches WHERE id = ? AND trainer_id = ? LIMIT 1',
    [batchId, user.sub]
  )
  return rows.length > 0
}

async function notify(userId, type, payload) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)',
    [userId, type, JSON.stringify(payload)]
  )
}

async function notifyBatchStudents(batchId, type, payload) {
  const [students] = await pool.query(
    "SELECT student_id FROM enrollments WHERE batch_id = ? AND status = 'active'",
    [batchId]
  )
  await Promise.all(students.map((s) => notify(s.student_id, type, payload)))
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express()
app.set('trust proxy', 1) // Hostinger/most shared hosts sit behind a reverse proxy; needed for correct rate-limit IPs
app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(cors({ origin: CORS_ORIGIN, credentials: true }))

const router = express.Router()

// tight limiter for credential-guessing-prone endpoints; generous limiter for everything else
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
})
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
})
router.use(apiLimiter)

// --- POST /auth/login ---
router.post('/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email])
  const user = rows[0]
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Incorrect email or password' })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email or password' })
  }

  const accessToken = signAccessToken(user)
  const { raw, hash } = generateRefreshToken()
  await storeRefreshToken(user.id, hash)
  setRefreshCookie(res, raw)

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])

  res.json({ accessToken })
})

// --- POST /auth/refresh ---
router.post('/auth/refresh', authLimiter, async (req, res) => {
  const rawToken = req.cookies.refresh_token
  if (!rawToken) return res.status(401).json({ error: 'No refresh token' })

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const [rows] = await pool.query(
    `SELECT rt.*, u.id AS uid, u.role, u.email, u.full_name, u.status
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  )
  const record = rows[0]
  if (!record || record.status !== 'active') {
    return res.status(401).json({ error: 'Refresh token invalid or expired' })
  }

  // rotate: revoke the used token, issue a new one
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [record.id])
  const { raw, hash } = generateRefreshToken()
  await storeRefreshToken(record.uid, hash)
  setRefreshCookie(res, raw)

  const accessToken = signAccessToken({
    id: record.uid,
    role: record.role,
    email: record.email,
    full_name: record.full_name,
  })

  res.json({ accessToken })
})

// --- POST /auth/logout ---
router.post('/auth/logout', async (req, res) => {
  const rawToken = req.cookies.refresh_token
  if (rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [tokenHash])
  }
  res.clearCookie('refresh_token', { path: '/api/v1/auth' })
  res.json({ ok: true })
})

// --- GET /me ---
router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, role, full_name, email, phone, avatar_url, status FROM users WHERE id = ? LIMIT 1',
    [req.user.sub]
  )
  if (!rows[0]) return res.status(404).json({ error: 'User not found' })
  res.json(rows[0])
})

// ---------------------------------------------------------------------------
// Courses / modules / lessons
// ---------------------------------------------------------------------------

// --- GET /courses --- admin: all courses. trainer: courses they have a batch on.
// student: courses they're actively enrolled in via a batch.
router.get('/courses', requireAuth, requireRole('admin', 'trainer', 'student'), async (req, res) => {
  if (req.user.role === 'admin') {
    const [rows] = await pool.query(
      'SELECT id, title, slug, description, thumbnail_url, fee_amount, status, created_at FROM courses ORDER BY created_at DESC'
    )
    return res.json(rows)
  }

  if (req.user.role === 'trainer') {
    const [rows] = await pool.query(
      `SELECT DISTINCT c.id, c.title, c.slug, c.description, c.thumbnail_url, c.fee_amount, c.status, c.created_at
       FROM courses c
       JOIN batches b ON b.course_id = c.id
       WHERE b.trainer_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.sub]
    )
    return res.json(rows)
  }

  const [rows] = await pool.query(
    `SELECT DISTINCT c.id, c.title, c.slug, c.description, c.thumbnail_url, c.fee_amount, c.status, c.created_at
     FROM courses c
     JOIN batches b ON b.course_id = c.id
     JOIN enrollments e ON e.batch_id = b.id
     WHERE e.student_id = ? AND e.status = 'active'
     ORDER BY c.created_at DESC`,
    [req.user.sub]
  )
  res.json(rows)
})

// --- GET /courses/:id --- full detail with nested modules + lessons.
// Access check: admin always; trainer/student only if they have a batch/enrollment on this course.
router.get('/courses/:id', requireAuth, requireRole('admin', 'trainer', 'student'), async (req, res) => {
  const courseId = Number(req.params.id)

  if (req.user.role !== 'admin') {
    const allowed = await hasCourseAccess(req.user, courseId)
    if (!allowed) return res.status(403).json({ error: 'Forbidden' })
  }

  const [courseRows] = await pool.query('SELECT * FROM courses WHERE id = ? LIMIT 1', [courseId])
  const course = courseRows[0]
  if (!course) return res.status(404).json({ error: 'Course not found' })

  const [modules] = await pool.query(
    'SELECT id, title, sort_order FROM modules WHERE course_id = ? ORDER BY sort_order',
    [courseId]
  )
  const [lessons] = await pool.query(
    `SELECT l.id, l.module_id, l.type, l.title, l.content_url, l.duration_seconds, l.sort_order,
            a.id AS assignment_id, q.id AS quiz_id
     FROM lessons l
     JOIN modules m ON m.id = l.module_id
     LEFT JOIN assignments a ON a.lesson_id = l.id
     LEFT JOIN quizzes q ON q.lesson_id = l.id
     WHERE m.course_id = ?
     ORDER BY l.sort_order`,
    [courseId]
  )

  course.modules = modules.map((m) => ({
    ...m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  }))

  res.json(course)
})

// --- POST /courses --- admin only
router.post('/courses', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, description, thumbnail_url, fee_amount, status } = req.body || {}
  if (!title) return res.status(400).json({ error: 'Title is required' })
  if (thumbnail_url && !isSafeUrl(thumbnail_url)) {
    return res.status(400).json({ error: 'thumbnail_url must be a valid https:// URL' })
  }

  const slug = slugify(title)
  try {
    const [result] = await pool.query(
      `INSERT INTO courses (title, slug, description, thumbnail_url, fee_amount, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        description || null,
        thumbnail_url || null,
        fee_amount || 0,
        status || 'draft',
        req.user.sub,
      ]
    )
    res.status(201).json({ id: result.insertId, title, slug })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A course with a similar title already exists' })
    }
    throw err
  }
})

// --- PUT /courses/:id --- admin only
router.put('/courses/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const courseId = Number(req.params.id)
  const { title, description, thumbnail_url, fee_amount, status } = req.body || {}

  const [result] = await pool.query(
    `UPDATE courses
     SET title = COALESCE(?, title),
         description = COALESCE(?, description),
         thumbnail_url = COALESCE(?, thumbnail_url),
         fee_amount = COALESCE(?, fee_amount),
         status = COALESCE(?, status)
     WHERE id = ?`,
    [title || null, description ?? null, thumbnail_url ?? null, fee_amount ?? null, status || null, courseId]
  )
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Course not found' })
  res.json({ ok: true })
})

// --- POST /courses/:id/modules --- admin, or trainer assigned to a batch of this course
router.post('/courses/:id/modules', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const courseId = Number(req.params.id)
  const { title } = req.body || {}
  if (!title) return res.status(400).json({ error: 'Title is required' })

  const [courseRows] = await pool.query('SELECT id FROM courses WHERE id = ? LIMIT 1', [courseId])
  if (!courseRows[0]) return res.status(404).json({ error: 'Course not found' })

  if (!(await hasCourseAccess(req.user, courseId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const sortOrder = await nextSortOrder('modules', 'course_id', courseId)
  const [result] = await pool.query(
    'INSERT INTO modules (course_id, title, sort_order) VALUES (?, ?, ?)',
    [courseId, title, sortOrder]
  )
  res.status(201).json({ id: result.insertId, course_id: courseId, title, sort_order: sortOrder })
})

// --- POST /modules/:id/lessons --- admin, or trainer assigned to a batch of this module's course
router.post('/modules/:id/lessons', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const moduleId = Number(req.params.id)
  const { type, title, content_url, duration_seconds } = req.body || {}

  const validTypes = ['video', 'notes', 'assignment', 'quiz']
  if (!title || !validTypes.includes(type)) {
    return res.status(400).json({ error: `Title and a valid type (${validTypes.join(', ')}) are required` })
  }
  if (content_url && !isSafeUrl(content_url)) {
    return res.status(400).json({ error: 'content_url must be a valid https:// URL' })
  }

  const [moduleRows] = await pool.query('SELECT id FROM modules WHERE id = ? LIMIT 1', [moduleId])
  if (!moduleRows[0]) return res.status(404).json({ error: 'Module not found' })

  if (!(await canEditModule(req.user, moduleId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const sortOrder = await nextSortOrder('lessons', 'module_id', moduleId)
  const [result] = await pool.query(
    `INSERT INTO lessons (module_id, type, title, content_url, duration_seconds, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [moduleId, type, title, content_url || null, duration_seconds || null, sortOrder]
  )
  res.status(201).json({ id: result.insertId, module_id: moduleId, type, title, sort_order: sortOrder })
})

// --- GET /lessons/:id --- fetch a single lesson (signed content URLs arrive with real storage in a later phase).
// Includes the linked assignment/quiz id (if any) so the frontend can render the right widget without a second round trip.
router.get('/lessons/:id', requireAuth, requireRole('admin', 'trainer', 'student'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT l.*, a.id AS assignment_id, a.instructions, a.due_at, a.max_score, q.id AS quiz_id
     FROM lessons l
     LEFT JOIN assignments a ON a.lesson_id = l.id
     LEFT JOIN quizzes q ON q.lesson_id = l.id
     WHERE l.id = ? LIMIT 1`,
    [req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Lesson not found' })

  if (req.user.role !== 'admin' && !(await canAccessLesson(req.user, rows[0].id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.json(rows[0])
})

// ---------------------------------------------------------------------------
// Lesson progress
// ---------------------------------------------------------------------------

// --- POST /lessons/:id/progress --- student only, upsert watch progress
router.post('/lessons/:id/progress', requireAuth, requireRole('student'), async (req, res) => {
  const lessonId = Number(req.params.id)
  const { watched_seconds, status } = req.body || {}

  const validStatuses = ['not_started', 'in_progress', 'completed']
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${validStatuses.join(', ')}` })
  }

  if (!(await canAccessLesson(req.user, lessonId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const resolvedStatus = status || 'in_progress'
  await pool.query(
    `INSERT INTO lesson_progress (student_id, lesson_id, status, watched_seconds, completed_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       watched_seconds = GREATEST(watched_seconds, VALUES(watched_seconds)),
       completed_at = VALUES(completed_at)`,
    [
      req.user.sub,
      lessonId,
      resolvedStatus,
      watched_seconds || 0,
      resolvedStatus === 'completed' ? new Date() : null,
    ]
  )
  res.json({ ok: true })
})

// --- GET /courses/:id/progress --- student only, progress across all lessons in this course
router.get('/courses/:id/progress', requireAuth, requireRole('student'), async (req, res) => {
  const courseId = Number(req.params.id)
  if (!(await hasCourseAccess(req.user, courseId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [rows] = await pool.query(
    `SELECT l.id AS lesson_id, COALESCE(lp.status, 'not_started') AS status, COALESCE(lp.watched_seconds, 0) AS watched_seconds
     FROM lessons l
     JOIN modules m ON m.id = l.module_id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = ?
     WHERE m.course_id = ?`,
    [req.user.sub, courseId]
  )
  res.json(rows)
})

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

// --- POST /lessons/:id/assignment --- admin, or trainer assigned to this course; creates the assignment for an 'assignment'-type lesson
router.post('/lessons/:id/assignment', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const lessonId = Number(req.params.id)
  const { instructions, due_at, max_score } = req.body || {}

  const [lessonRows] = await pool.query('SELECT id, type, module_id FROM lessons WHERE id = ? LIMIT 1', [lessonId])
  if (!lessonRows[0]) return res.status(404).json({ error: 'Lesson not found' })
  if (lessonRows[0].type !== 'assignment') {
    return res.status(400).json({ error: 'Lesson is not an assignment-type lesson' })
  }
  if (!(await canEditModule(req.user, lessonRows[0].module_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO assignments (lesson_id, instructions, due_at, max_score) VALUES (?, ?, ?, ?)',
      [lessonId, instructions || null, due_at || null, max_score || 100]
    )
    res.status(201).json({ id: result.insertId, lesson_id: lessonId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This lesson already has an assignment' })
    }
    throw err
  }
})

// --- POST /assignments/:id/submit --- student only
router.post('/assignments/:id/submit', requireAuth, requireRole('student'), async (req, res) => {
  const assignmentId = Number(req.params.id)
  const { file_url } = req.body || {}
  if (!file_url) return res.status(400).json({ error: 'file_url is required' })
  if (!isSafeUrl(file_url)) return res.status(400).json({ error: 'file_url must be a valid https:// URL' })

  const [rows] = await pool.query(
    `SELECT a.id, l.id AS lesson_id FROM assignments a
     JOIN lessons l ON l.id = a.lesson_id
     WHERE a.id = ? LIMIT 1`,
    [assignmentId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Assignment not found' })
  if (!(await canAccessLesson(req.user, rows[0].lesson_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  await pool.query(
    `INSERT INTO assignment_submissions (assignment_id, student_id, file_url)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), submitted_at = NOW(), score = NULL, feedback = NULL, graded_by = NULL, graded_at = NULL`,
    [assignmentId, req.user.sub, file_url]
  )
  res.status(201).json({ ok: true })
})

// --- GET /assignments/:id/submissions --- admin, or trainer assigned to this course; grading queue
router.get('/assignments/:id/submissions', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const assignmentId = Number(req.params.id)

  const [assignmentRows] = await pool.query(
    `SELECT a.id, m.id AS module_id FROM assignments a
     JOIN lessons l ON l.id = a.lesson_id
     JOIN modules m ON m.id = l.module_id
     WHERE a.id = ? LIMIT 1`,
    [assignmentId]
  )
  if (!assignmentRows[0]) return res.status(404).json({ error: 'Assignment not found' })
  if (!(await canEditModule(req.user, assignmentRows[0].module_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [rows] = await pool.query(
    `SELECT s.id, s.student_id, u.full_name AS student_name, s.file_url, s.submitted_at, s.score, s.feedback
     FROM assignment_submissions s
     JOIN users u ON u.id = s.student_id
     WHERE s.assignment_id = ?
     ORDER BY s.submitted_at DESC`,
    [assignmentId]
  )
  res.json(rows)
})

// --- PUT /submissions/:id/grade --- admin, or trainer assigned to this course
router.put('/submissions/:id/grade', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const submissionId = Number(req.params.id)
  const { score, feedback } = req.body || {}
  if (score === undefined) return res.status(400).json({ error: 'score is required' })

  const [rows] = await pool.query(
    `SELECT s.id, s.student_id, m.id AS module_id, a.max_score, l.title AS lesson_title
     FROM assignment_submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN lessons l ON l.id = a.lesson_id
     JOIN modules m ON m.id = l.module_id
     WHERE s.id = ? LIMIT 1`,
    [submissionId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Submission not found' })
  if (!(await canEditModule(req.user, rows[0].module_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (score < 0 || score > rows[0].max_score) {
    return res.status(400).json({ error: `score must be between 0 and ${rows[0].max_score}` })
  }

  await pool.query(
    'UPDATE assignment_submissions SET score = ?, feedback = ?, graded_by = ?, graded_at = NOW() WHERE id = ?',
    [score, feedback || null, req.user.sub, submissionId]
  )

  await notify(rows[0].student_id, 'assignment_due', {
    message: `Your submission for "${rows[0].lesson_title}" was graded: ${score}/${rows[0].max_score}`,
  })

  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

// --- POST /lessons/:id/quiz --- admin, or trainer assigned to this course
router.post('/lessons/:id/quiz', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const lessonId = Number(req.params.id)
  const { title, time_limit_minutes, pass_score, questions } = req.body || {}

  const [lessonRows] = await pool.query('SELECT id, type, module_id FROM lessons WHERE id = ? LIMIT 1', [lessonId])
  if (!lessonRows[0]) return res.status(404).json({ error: 'Lesson not found' })
  if (lessonRows[0].type !== 'quiz') {
    return res.status(400).json({ error: 'Lesson is not a quiz-type lesson' })
  }
  if (!(await canEditModule(req.user, lessonRows[0].module_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'title and a non-empty questions array are required' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [quizResult] = await conn.query(
      'INSERT INTO quizzes (lesson_id, title, time_limit_minutes, pass_score) VALUES (?, ?, ?, ?)',
      [lessonId, title, time_limit_minutes || null, pass_score || 0]
    )
    const quizId = quizResult.insertId

    let sortOrder = 0
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || typeof q.correct_index !== 'number') {
        throw Object.assign(new Error('Each question needs question, options[], correct_index'), { status: 400 })
      }
      await conn.query(
        'INSERT INTO quiz_questions (quiz_id, question, options, correct_index, sort_order) VALUES (?, ?, ?, ?, ?)',
        [quizId, q.question, JSON.stringify(q.options), q.correct_index, sortOrder++]
      )
    }

    await conn.commit()
    res.status(201).json({ id: quizId, lesson_id: lessonId, title })
  } catch (err) {
    await conn.rollback()
    if (err.status === 400) return res.status(400).json({ error: err.message })
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This lesson already has a quiz' })
    }
    throw err
  } finally {
    conn.release()
  }
})

// --- GET /quizzes/:id --- fetch quiz + questions WITHOUT correct answers (for taking the quiz)
router.get('/quizzes/:id', requireAuth, requireRole('admin', 'trainer', 'student'), async (req, res) => {
  const quizId = Number(req.params.id)

  const [quizRows] = await pool.query(
    `SELECT q.id, q.title, q.time_limit_minutes, q.pass_score, l.id AS lesson_id
     FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
     WHERE q.id = ? LIMIT 1`,
    [quizId]
  )
  const quiz = quizRows[0]
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

  if (req.user.role !== 'admin' && !(await canAccessLesson(req.user, quiz.lesson_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [questions] = await pool.query(
    'SELECT id, question, options, sort_order FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order',
    [quizId]
  )
  quiz.questions = questions
  res.json(quiz)
})

// --- POST /quizzes/:id/attempt --- student only, submit answers and get an auto-computed score
router.post('/quizzes/:id/attempt', requireAuth, requireRole('student'), async (req, res) => {
  const quizId = Number(req.params.id)
  const { answers } = req.body || {} // { [questionId]: selectedIndex }
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'answers object is required' })
  }

  const [quizRows] = await pool.query(
    `SELECT q.id, q.pass_score, l.id AS lesson_id FROM quizzes q
     JOIN lessons l ON l.id = q.lesson_id
     WHERE q.id = ? LIMIT 1`,
    [quizId]
  )
  const quiz = quizRows[0]
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })
  if (!(await canAccessLesson(req.user, quiz.lesson_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [questions] = await pool.query(
    'SELECT id, correct_index FROM quiz_questions WHERE quiz_id = ?',
    [quizId]
  )

  let correctCount = 0
  for (const q of questions) {
    if (Number(answers[q.id]) === q.correct_index) correctCount++
  }
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  const passed = score >= quiz.pass_score

  await pool.query(
    'INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, passed) VALUES (?, ?, ?, ?, ?)',
    [quizId, req.user.sub, JSON.stringify(answers), score, passed]
  )

  res.status(201).json({ score, passed, correctCount, totalQuestions: questions.length })
})

// ---------------------------------------------------------------------------
// Batches / enrollment
// ---------------------------------------------------------------------------

// --- GET /batches --- admin: all batches. trainer: batches assigned to them.
router.get('/batches', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const where = req.user.role === 'trainer' ? 'WHERE b.trainer_id = ?' : ''
  const params = req.user.role === 'trainer' ? [req.user.sub] : []

  const [rows] = await pool.query(
    `SELECT b.id, b.name, b.start_date, b.end_date, b.course_id,
            c.title AS course_title,
            b.trainer_id, u.full_name AS trainer_name,
            (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id = b.id AND e.status = 'active') AS student_count
     FROM batches b
     JOIN courses c ON c.id = b.course_id
     LEFT JOIN users u ON u.id = b.trainer_id
     ${where}
     ORDER BY b.created_at DESC`,
    params
  )
  res.json(rows)
})

// --- GET /batches/:id --- detail + enrolled students
router.get('/batches/:id', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const batchId = Number(req.params.id)

  const [batchRows] = await pool.query(
    `SELECT b.*, c.title AS course_title, u.full_name AS trainer_name
     FROM batches b
     JOIN courses c ON c.id = b.course_id
     LEFT JOIN users u ON u.id = b.trainer_id
     WHERE b.id = ? LIMIT 1`,
    [batchId]
  )
  const batch = batchRows[0]
  if (!batch) return res.status(404).json({ error: 'Batch not found' })
  if (req.user.role === 'trainer' && batch.trainer_id !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [students] = await pool.query(
    `SELECT u.id, u.full_name, u.email, e.status, e.enrolled_at
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     WHERE e.batch_id = ?
     ORDER BY e.enrolled_at DESC`,
    [batchId]
  )
  batch.students = students

  res.json(batch)
})

// --- POST /batches --- admin only, assigns trainer at creation
router.post('/batches', requireAuth, requireRole('admin'), async (req, res) => {
  const { course_id, trainer_id, name, start_date, end_date } = req.body || {}
  if (!course_id || !name) {
    return res.status(400).json({ error: 'course_id and name are required' })
  }

  const [courseRows] = await pool.query('SELECT id FROM courses WHERE id = ? LIMIT 1', [course_id])
  if (!courseRows[0]) return res.status(404).json({ error: 'Course not found' })

  if (trainer_id) {
    const [trainerRows] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'trainer' LIMIT 1",
      [trainer_id]
    )
    if (!trainerRows[0]) return res.status(400).json({ error: 'trainer_id is not a valid trainer' })
  }

  const [result] = await pool.query(
    'INSERT INTO batches (course_id, trainer_id, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
    [course_id, trainer_id || null, name, start_date || null, end_date || null]
  )
  res.status(201).json({ id: result.insertId, course_id, trainer_id: trainer_id || null, name })
})

// --- PUT /batches/:id/trainer --- admin only, (re)assign trainer
router.put('/batches/:id/trainer', requireAuth, requireRole('admin'), async (req, res) => {
  const batchId = Number(req.params.id)
  const { trainer_id } = req.body || {}

  if (trainer_id) {
    const [trainerRows] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'trainer' LIMIT 1",
      [trainer_id]
    )
    if (!trainerRows[0]) return res.status(400).json({ error: 'trainer_id is not a valid trainer' })
  }

  const [result] = await pool.query('UPDATE batches SET trainer_id = ? WHERE id = ?', [
    trainer_id || null,
    batchId,
  ])
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Batch not found' })
  res.json({ ok: true })
})

// --- POST /batches/:id/enroll --- admin only, enroll a student
router.post('/batches/:id/enroll', requireAuth, requireRole('admin'), async (req, res) => {
  const batchId = Number(req.params.id)
  const { student_id, access_expires_at } = req.body || {}
  if (!student_id) return res.status(400).json({ error: 'student_id is required' })

  const [batchRows] = await pool.query('SELECT id FROM batches WHERE id = ? LIMIT 1', [batchId])
  if (!batchRows[0]) return res.status(404).json({ error: 'Batch not found' })

  const [studentRows] = await pool.query(
    "SELECT id FROM users WHERE id = ? AND role = 'student' LIMIT 1",
    [student_id]
  )
  if (!studentRows[0]) return res.status(400).json({ error: 'student_id is not a valid student' })

  try {
    const [result] = await pool.query(
      'INSERT INTO enrollments (student_id, batch_id, access_expires_at) VALUES (?, ?, ?)',
      [student_id, batchId, access_expires_at || null]
    )
    res.status(201).json({ id: result.insertId, student_id, batch_id: batchId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Student is already enrolled in this batch' })
    }
    throw err
  }
})

// ---------------------------------------------------------------------------
// Live classes / attendance
// ---------------------------------------------------------------------------

// --- GET /batches/:id/live-sessions --- admin, assigned trainer, or an actively enrolled student
router.get('/batches/:id/live-sessions', requireAuth, requireRole('admin', 'trainer', 'student'), async (req, res) => {
  const batchId = Number(req.params.id)

  if (req.user.role === 'trainer' && !(await canManageBatch(req.user, batchId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (req.user.role === 'student') {
    const [enrolled] = await pool.query(
      "SELECT 1 FROM enrollments WHERE batch_id = ? AND student_id = ? AND status = 'active' LIMIT 1",
      [batchId, req.user.sub]
    )
    if (!enrolled[0]) return res.status(403).json({ error: 'Forbidden' })
  }

  const [rows] = await pool.query(
    'SELECT id, title, platform, join_url, starts_at, duration_minutes FROM live_sessions WHERE batch_id = ? ORDER BY starts_at',
    [batchId]
  )
  res.json(rows)
})

// --- GET /live-sessions/upcoming --- student only, across all their enrolled batches
router.get('/live-sessions/upcoming', requireAuth, requireRole('student'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ls.id, ls.title, ls.platform, ls.join_url, ls.starts_at, ls.duration_minutes,
            b.name AS batch_name, c.title AS course_title
     FROM live_sessions ls
     JOIN batches b ON b.id = ls.batch_id
     JOIN courses c ON c.id = b.course_id
     JOIN enrollments e ON e.batch_id = b.id
     WHERE e.student_id = ? AND e.status = 'active' AND ls.starts_at >= NOW() - INTERVAL 2 HOUR
     ORDER BY ls.starts_at`,
    [req.user.sub]
  )
  res.json(rows)
})

// --- POST /batches/:id/live-sessions --- admin, or trainer assigned to this batch
router.post('/batches/:id/live-sessions', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const batchId = Number(req.params.id)
  const { title, platform, join_url, starts_at, duration_minutes } = req.body || {}

  if (!title || !join_url || !starts_at) {
    return res.status(400).json({ error: 'title, join_url and starts_at are required' })
  }
  const validPlatforms = ['zoom', 'meet', 'teams']
  if (platform && !validPlatforms.includes(platform)) {
    return res.status(400).json({ error: `platform must be one of ${validPlatforms.join(', ')}` })
  }
  if (!isSafeUrl(join_url)) {
    return res.status(400).json({ error: 'join_url must be a valid https:// URL' })
  }

  const [batchRows] = await pool.query('SELECT id FROM batches WHERE id = ? LIMIT 1', [batchId])
  if (!batchRows[0]) return res.status(404).json({ error: 'Batch not found' })
  if (!(await canManageBatch(req.user, batchId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [result] = await pool.query(
    `INSERT INTO live_sessions (batch_id, title, platform, join_url, starts_at, duration_minutes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [batchId, title, platform || 'zoom', join_url, starts_at, duration_minutes || 60, req.user.sub]
  )

  await notifyBatchStudents(batchId, 'class_reminder', {
    message: `New live class scheduled: "${title}" at ${starts_at}`,
    live_session_id: result.insertId,
  })

  res.status(201).json({ id: result.insertId, batch_id: batchId, title })
})

// --- PUT /live-sessions/:id/attendance --- admin, or trainer assigned to the session's batch
// body: { records: [{ student_id, status }] }
router.put('/live-sessions/:id/attendance', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const sessionId = Number(req.params.id)
  const { records } = req.body || {}
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records array is required' })
  }
  const validStatuses = ['present', 'absent', 'late']
  for (const r of records) {
    if (!r.student_id || !validStatuses.includes(r.status)) {
      return res.status(400).json({ error: `each record needs student_id and status in ${validStatuses.join(', ')}` })
    }
  }

  const [sessionRows] = await pool.query('SELECT batch_id FROM live_sessions WHERE id = ? LIMIT 1', [sessionId])
  if (!sessionRows[0]) return res.status(404).json({ error: 'Live session not found' })
  if (!(await canManageBatch(req.user, sessionRows[0].batch_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const r of records) {
      await conn.query(
        `INSERT INTO attendance (live_session_id, student_id, status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), marked_at = NOW()`,
        [sessionId, r.student_id, r.status]
      )
    }
    await conn.commit()
    res.json({ ok: true })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})

// --- GET /live-sessions/:id/attendance --- admin, or trainer assigned to the session's batch
router.get('/live-sessions/:id/attendance', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const sessionId = Number(req.params.id)

  const [sessionRows] = await pool.query('SELECT batch_id FROM live_sessions WHERE id = ? LIMIT 1', [sessionId])
  if (!sessionRows[0]) return res.status(404).json({ error: 'Live session not found' })
  if (!(await canManageBatch(req.user, sessionRows[0].batch_id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [rows] = await pool.query(
    `SELECT u.id AS student_id, u.full_name, e.status AS enrollment_status,
            a.status AS attendance_status, a.marked_at
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     LEFT JOIN attendance a ON a.live_session_id = ? AND a.student_id = e.student_id
     WHERE e.batch_id = ?
     ORDER BY u.full_name`,
    [sessionId, sessionRows[0].batch_id]
  )
  res.json(rows)
})

// ---------------------------------------------------------------------------
// Fees / invoicing
// ---------------------------------------------------------------------------

async function generateInvoiceNo() {
  const year = new Date().getFullYear()
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM invoices WHERE invoice_no LIKE ?",
    [`INV-${year}-%`]
  )
  const seq = String(rows[0].n + 1).padStart(5, '0')
  return `INV-${year}-${seq}`
}

// --- POST /invoices --- admin only
router.post('/invoices', requireAuth, requireRole('admin'), async (req, res) => {
  const { student_id, course_id, total_fee } = req.body || {}
  if (!student_id || !course_id || total_fee == null) {
    return res.status(400).json({ error: 'student_id, course_id and total_fee are required' })
  }

  const [studentRows] = await pool.query(
    "SELECT id FROM users WHERE id = ? AND role = 'student' LIMIT 1",
    [student_id]
  )
  if (!studentRows[0]) return res.status(400).json({ error: 'student_id is not a valid student' })

  const [courseRows] = await pool.query('SELECT id FROM courses WHERE id = ? LIMIT 1', [course_id])
  if (!courseRows[0]) return res.status(404).json({ error: 'Course not found' })

  const invoiceNo = await generateInvoiceNo()
  const [result] = await pool.query(
    'INSERT INTO invoices (student_id, course_id, total_fee, invoice_no, created_by) VALUES (?, ?, ?, ?, ?)',
    [student_id, course_id, total_fee, invoiceNo, req.user.sub]
  )
  res.status(201).json({ id: result.insertId, invoice_no: invoiceNo, student_id, course_id, total_fee })
})

// --- POST /invoices/:id/payments --- admin only, record an installment
router.post('/invoices/:id/payments', requireAuth, requireRole('admin'), async (req, res) => {
  const invoiceId = Number(req.params.id)
  const { amount, mode, txn_ref } = req.body || {}

  const validModes = ['cash', 'upi', 'card', 'netbanking']
  if (!amount || !validModes.includes(mode)) {
    return res.status(400).json({ error: `amount and a valid mode (${validModes.join(', ')}) are required` })
  }

  const [invoiceRows] = await pool.query('SELECT id, student_id FROM invoices WHERE id = ? LIMIT 1', [invoiceId])
  if (!invoiceRows[0]) return res.status(404).json({ error: 'Invoice not found' })

  const [result] = await pool.query(
    'INSERT INTO payments (invoice_id, amount, mode, txn_ref, verified_by) VALUES (?, ?, ?, ?, ?)',
    [invoiceId, amount, mode, txn_ref || null, req.user.sub]
  )

  await notify(invoiceRows[0].student_id, 'payment_reminder', {
    message: `Payment of ₹${amount} recorded against invoice #${invoiceId}`,
  })

  res.status(201).json({ id: result.insertId, invoice_id: invoiceId, amount })
})

// --- GET /students/:id/invoices --- admin (any student), or the student themself
router.get('/students/:id/invoices', requireAuth, requireRole('admin', 'student'), async (req, res) => {
  const studentId = Number(req.params.id)
  if (req.user.role === 'student' && req.user.sub !== studentId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [invoices] = await pool.query(
    `SELECT i.id, i.invoice_no, i.total_fee, i.created_at, c.title AS course_title,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid
     FROM invoices i
     JOIN courses c ON c.id = i.course_id
     WHERE i.student_id = ?
     ORDER BY i.created_at DESC`,
    [studentId]
  )

  for (const inv of invoices) {
    inv.pending = Number(inv.total_fee) - Number(inv.paid)
  }

  res.json(invoices)
})

// --- GET /invoices/:id/payments --- admin, or the owning student
router.get('/invoices/:id/payments', requireAuth, requireRole('admin', 'student'), async (req, res) => {
  const invoiceId = Number(req.params.id)

  const [invoiceRows] = await pool.query('SELECT student_id FROM invoices WHERE id = ? LIMIT 1', [invoiceId])
  if (!invoiceRows[0]) return res.status(404).json({ error: 'Invoice not found' })
  if (req.user.role === 'student' && req.user.sub !== invoiceRows[0].student_id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [rows] = await pool.query(
    'SELECT id, amount, mode, txn_ref, paid_at FROM payments WHERE invoice_id = ? ORDER BY paid_at',
    [invoiceId]
  )
  res.json(rows)
})

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

async function generateCertificateNo() {
  const year = new Date().getFullYear()
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM certificates WHERE certificate_no LIKE ?",
    [`CERT-${year}-%`]
  )
  const seq = String(rows[0].n + 1).padStart(5, '0')
  return `CERT-${year}-${seq}`
}

// --- POST /students/:id/certificates --- admin only.
// Completion rule enforced here: every lesson in the course must be marked 'completed' for this student.
router.post('/students/:id/certificates', requireAuth, requireRole('admin'), async (req, res) => {
  const studentId = Number(req.params.id)
  const { course_id, type } = req.body || {}
  if (!course_id) return res.status(400).json({ error: 'course_id is required' })

  const validTypes = ['completion', 'internship']
  const certType = type || 'completion'
  if (!validTypes.includes(certType)) {
    return res.status(400).json({ error: `type must be one of ${validTypes.join(', ')}` })
  }

  const [totalRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?`,
    [course_id]
  )
  const [completedRows] = await pool.query(
    `SELECT COUNT(*) AS completed FROM lessons l
     JOIN modules m ON m.id = l.module_id
     JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = ? AND lp.status = 'completed'
     WHERE m.course_id = ?`,
    [studentId, course_id]
  )
  const total = totalRows[0].total
  const completed = completedRows[0].completed
  if (total === 0 || completed < total) {
    return res.status(400).json({
      error: `Course not yet complete for this student (${completed}/${total} lessons done)`,
    })
  }

  const certificateNo = await generateCertificateNo()
  try {
    const [result] = await pool.query(
      `INSERT INTO certificates (student_id, course_id, type, certificate_no, issued_by)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, course_id, certType, certificateNo, req.user.sub]
    )
    res.status(201).json({ id: result.insertId, certificate_no: certificateNo, student_id, course_id, type: certType })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A certificate of this type already exists for this student and course' })
    }
    throw err
  }
})

// --- GET /students/:id/certificates --- admin (any student), or the student themself
router.get('/students/:id/certificates', requireAuth, requireRole('admin', 'student'), async (req, res) => {
  const studentId = Number(req.params.id)
  if (req.user.role === 'student' && req.user.sub !== studentId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const [rows] = await pool.query(
    `SELECT c.id, c.certificate_no, c.type, c.issued_at, c.file_url, co.title AS course_title
     FROM certificates c
     JOIN courses co ON co.id = c.course_id
     WHERE c.student_id = ?
     ORDER BY c.issued_at DESC`,
    [studentId]
  )
  res.json(rows)
})

// --- GET /students --- admin only, for enroll-picker dropdowns
router.get('/students', requireAuth, requireRole('admin'), async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, full_name, email FROM users WHERE role = 'student' AND status = 'active' ORDER BY full_name"
  )
  res.json(rows)
})

// --- GET /trainers --- admin only, for trainer-assignment dropdowns
router.get('/trainers', requireAuth, requireRole('admin'), async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, full_name, email FROM users WHERE role = 'trainer' AND status = 'active' ORDER BY full_name"
  )
  res.json(rows)
})

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

// --- GET /notifications --- the current user's own notifications, newest first
router.get('/notifications', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, type, payload, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.sub]
  )
  res.json(rows)
})

// --- PUT /notifications/:id/read --- mark one of the current user's notifications as read
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  const [result] = await pool.query(
    'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL',
    [req.params.id, req.user.sub]
  )
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' })
  res.json({ ok: true })
})

// --- POST /announcements --- admin only, broadcast to every active student in a batch
router.post('/batches/:id/announcements', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const batchId = Number(req.params.id)
  const { message } = req.body || {}
  if (!message) return res.status(400).json({ error: 'message is required' })

  if (!(await canManageBatch(req.user, batchId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  await notifyBatchStudents(batchId, 'announcement', { message })
  res.status(201).json({ ok: true })
})

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

// --- GET /reports/progress --- admin: all batches. trainer: their batches. Per-batch completion %.
router.get('/reports/progress', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const where = req.user.role === 'trainer' ? 'WHERE b.trainer_id = ?' : ''
  const params = req.user.role === 'trainer' ? [req.user.sub] : []

  const [rows] = await pool.query(
    `SELECT b.id AS batch_id, b.name AS batch_name, c.title AS course_title,
            COUNT(DISTINCT e.student_id) AS enrolled_students,
            COUNT(DISTINCT l.id) AS total_lessons,
            COALESCE(SUM(CASE WHEN lp.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_lesson_records
     FROM batches b
     JOIN courses c ON c.id = b.course_id
     LEFT JOIN enrollments e ON e.batch_id = b.id AND e.status = 'active'
     LEFT JOIN modules m ON m.course_id = b.course_id
     LEFT JOIN lessons l ON l.module_id = m.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = e.student_id
     ${where}
     GROUP BY b.id, b.name, c.title
     ORDER BY b.created_at DESC`,
    params
  )

  for (const row of rows) {
    const possible = row.enrolled_students * row.total_lessons
    row.completion_percent = possible > 0 ? Math.round((row.completed_lesson_records / possible) * 100) : 0
  }

  res.json(rows)
})

// --- GET /reports/payments --- admin only, collections summary across all invoices
router.get('/reports/payments', requireAuth, requireRole('admin'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id AS course_id, c.title AS course_title,
            COUNT(DISTINCT i.id) AS invoice_count,
            COALESCE(SUM(i.total_fee), 0) AS total_billed,
            COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i2 ON i2.id = p.invoice_id WHERE i2.course_id = c.id), 0) AS total_collected
     FROM courses c
     LEFT JOIN invoices i ON i.course_id = c.id
     GROUP BY c.id, c.title
     ORDER BY c.title`
  )
  for (const row of rows) {
    row.total_pending = Number(row.total_billed) - Number(row.total_collected)
  }
  res.json(rows)
})

// --- GET /reports/attendance --- admin: all batches. trainer: their batches. Attendance rate per batch.
router.get('/reports/attendance', requireAuth, requireRole('admin', 'trainer'), async (req, res) => {
  const where = req.user.role === 'trainer' ? 'WHERE b.trainer_id = ?' : ''
  const params = req.user.role === 'trainer' ? [req.user.sub] : []

  const [rows] = await pool.query(
    `SELECT b.id AS batch_id, b.name AS batch_name,
            COUNT(DISTINCT ls.id) AS session_count,
            COUNT(a.id) AS attendance_records,
            COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0) AS present_count
     FROM batches b
     LEFT JOIN live_sessions ls ON ls.batch_id = b.id
     LEFT JOIN attendance a ON a.live_session_id = ls.id
     ${where}
     GROUP BY b.id, b.name
     ORDER BY b.created_at DESC`,
    params
  )
  for (const row of rows) {
    row.attendance_rate_percent =
      row.attendance_records > 0 ? Math.round((row.present_count / row.attendance_records) * 100) : 0
  }
  res.json(rows)
})

// ---------------------------------------------------------------------------
// Dashboards (aggregate summaries per role)
// ---------------------------------------------------------------------------

// --- GET /dashboard/admin --- institute-wide counts, collections trend, recent enrollments
router.get('/dashboard/admin', requireAuth, requireRole('admin'), async (req, res) => {
  const [[studentCount]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role = 'student' AND status = 'active'")
  const [[trainerCount]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role = 'trainer' AND status = 'active'")
  const [[courseCount]] = await pool.query("SELECT COUNT(*) AS n FROM courses WHERE status = 'published'")
  const [[batchCount]] = await pool.query('SELECT COUNT(*) AS n FROM batches')

  const [[collectionsThisMonth]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
     WHERE YEAR(paid_at) = YEAR(CURDATE()) AND MONTH(paid_at) = MONTH(CURDATE())`
  )
  const [[pendingFees]] = await pool.query(
    `SELECT COALESCE(SUM(i.total_fee), 0) - COALESCE((SELECT SUM(amount) FROM payments), 0) AS total FROM invoices i`
  )

  const [recentEnrollments] = await pool.query(
    `SELECT e.id, u.full_name AS student_name, c.title AS course_title, b.name AS batch_name, e.enrolled_at
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     JOIN batches b ON b.id = e.batch_id
     JOIN courses c ON c.id = b.course_id
     ORDER BY e.enrolled_at DESC
     LIMIT 5`
  )

  const [collectionsSeries] = await pool.query(
    `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, COALESCE(SUM(amount), 0) AS total
     FROM payments
     WHERE paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
     ORDER BY month`
  )

  res.json({
    studentCount: studentCount.n,
    trainerCount: trainerCount.n,
    courseCount: courseCount.n,
    batchCount: batchCount.n,
    collectionsThisMonth: Number(collectionsThisMonth.total),
    pendingFees: Number(pendingFees.total),
    recentEnrollments,
    collectionsSeries: collectionsSeries.map((r) => ({ month: r.month, total: Number(r.total) })),
  })
})

// --- GET /dashboard/trainer --- assigned batches, students, pending grading, upcoming sessions
router.get('/dashboard/trainer', requireAuth, requireRole('trainer'), async (req, res) => {
  const trainerId = req.user.sub

  const [[batchCount]] = await pool.query('SELECT COUNT(*) AS n FROM batches WHERE trainer_id = ?', [trainerId])
  const [[studentCount]] = await pool.query(
    `SELECT COUNT(DISTINCT e.student_id) AS n FROM enrollments e
     JOIN batches b ON b.id = e.batch_id
     WHERE b.trainer_id = ? AND e.status = 'active'`,
    [trainerId]
  )
  const [[pendingGrading]] = await pool.query(
    `SELECT COUNT(*) AS n FROM assignment_submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN lessons l ON l.id = a.lesson_id
     JOIN modules m ON m.id = l.module_id
     JOIN batches b ON b.course_id = m.course_id
     WHERE b.trainer_id = ? AND s.graded_at IS NULL`,
    [trainerId]
  )

  const [upcomingSessions] = await pool.query(
    `SELECT ls.id, ls.title, ls.starts_at, ls.platform, b.name AS batch_name
     FROM live_sessions ls
     JOIN batches b ON b.id = ls.batch_id
     WHERE b.trainer_id = ? AND ls.starts_at >= NOW()
     ORDER BY ls.starts_at
     LIMIT 5`,
    [trainerId]
  )

  const [recentSubmissions] = await pool.query(
    `SELECT s.id, u.full_name AS student_name, l.title AS lesson_title, s.submitted_at
     FROM assignment_submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN lessons l ON l.id = a.lesson_id
     JOIN modules m ON m.id = l.module_id
     JOIN batches b ON b.course_id = m.course_id
     JOIN users u ON u.id = s.student_id
     WHERE b.trainer_id = ? AND s.graded_at IS NULL
     ORDER BY s.submitted_at DESC
     LIMIT 5`,
    [trainerId]
  )

  res.json({
    batchCount: batchCount.n,
    studentCount: studentCount.n,
    pendingGrading: pendingGrading.n,
    upcomingSessions,
    recentSubmissions,
  })
})

// --- GET /dashboard/student --- enrolled courses with progress, next session, fee balance, recent activity
router.get('/dashboard/student', requireAuth, requireRole('student'), async (req, res) => {
  const studentId = req.user.sub

  const [courseProgress] = await pool.query(
    `SELECT c.id, c.title,
            COUNT(l.id) AS total_lessons,
            COALESCE(SUM(CASE WHEN lp.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_lessons
     FROM enrollments e
     JOIN batches b ON b.id = e.batch_id
     JOIN courses c ON c.id = b.course_id
     JOIN modules m ON m.course_id = c.id
     JOIN lessons l ON l.module_id = m.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = ?
     WHERE e.student_id = ? AND e.status = 'active'
     GROUP BY c.id, c.title`,
    [studentId, studentId]
  )
  for (const c of courseProgress) {
    c.percent = c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0
  }

  const [[nextSession]] = await pool.query(
    `SELECT ls.id, ls.title, ls.starts_at, ls.join_url, c.title AS course_title
     FROM live_sessions ls
     JOIN batches b ON b.id = ls.batch_id
     JOIN courses c ON c.id = b.course_id
     JOIN enrollments e ON e.batch_id = b.id
     WHERE e.student_id = ? AND e.status = 'active' AND ls.starts_at >= NOW()
     ORDER BY ls.starts_at
     LIMIT 1`,
    [studentId]
  )

  const [[feeBalance]] = await pool.query(
    `SELECT COALESCE(SUM(i.total_fee), 0) - COALESCE((
       SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id IN (SELECT id FROM invoices WHERE student_id = ?)
     ), 0) AS pending
     FROM invoices i WHERE i.student_id = ?`,
    [studentId, studentId]
  )

  const [recentActivity] = await pool.query(
    `SELECT s.id, l.title AS lesson_title, s.score, s.graded_at
     FROM assignment_submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN lessons l ON l.id = a.lesson_id
     WHERE s.student_id = ? AND s.graded_at IS NOT NULL
     ORDER BY s.graded_at DESC
     LIMIT 5`,
    [studentId]
  )

  res.json({
    courseProgress,
    nextSession: nextSession || null,
    pendingFees: Number(feeBalance.pending),
    recentActivity,
  })
})

// --- role-gated smoke-test routes, replaced by real feature routes in later phases ---
router.get('/student/ping', requireAuth, requireRole('student'), (req, res) => {
  res.json({ ok: true, scope: 'student' })
})
router.get('/trainer/ping', requireAuth, requireRole('trainer'), (req, res) => {
  res.json({ ok: true, scope: 'trainer' })
})
router.get('/admin/ping', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ ok: true, scope: 'admin' })
})

app.use('/api/v1', router)

app.get('/health', (req, res) => res.json({ ok: true }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`LMS API listening on port ${PORT}`)
})
