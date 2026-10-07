-- Demo seed data for client walkthroughs.
-- Run after schema.sql: mysql -u root -p lms < sql/seed_demo.sql
-- All demo users share the password: Demo@123

INSERT INTO users (role, full_name, email, phone, password_hash, status) VALUES
  ('trainer', 'Ananya Rao', 'trainer@example.com', '9876543210', '$2b$12$/ZiUHqegIat.UR7wnJ7LZe5HgFlsAA7umlJPkigv9XbB/IBWPL6Oe', 'active'),
  ('student', 'Rohit Sharma', 'rohit@example.com', '9876500001', '$2b$12$/ZiUHqegIat.UR7wnJ7LZe5HgFlsAA7umlJPkigv9XbB/IBWPL6Oe', 'active'),
  ('student', 'Priya Nair', 'priya@example.com', '9876500002', '$2b$12$/ZiUHqegIat.UR7wnJ7LZe5HgFlsAA7umlJPkigv9XbB/IBWPL6Oe', 'active'),
  ('student', 'Karan Mehta', 'karan@example.com', '9876500003', '$2b$12$/ZiUHqegIat.UR7wnJ7LZe5HgFlsAA7umlJPkigv9XbB/IBWPL6Oe', 'active')
ON DUPLICATE KEY UPDATE email = email;

SET @trainer_id = (SELECT id FROM users WHERE email = 'trainer@example.com');
SET @rohit_id   = (SELECT id FROM users WHERE email = 'rohit@example.com');
SET @priya_id   = (SELECT id FROM users WHERE email = 'priya@example.com');
SET @karan_id   = (SELECT id FROM users WHERE email = 'karan@example.com');
SET @admin_id   = (SELECT id FROM users WHERE email = 'admin@example.com');

-- Course
INSERT INTO courses (title, slug, description, fee_amount, status, created_by)
VALUES (
  'Full-Stack Web Development',
  'full-stack-web-development',
  'A hands-on course covering React, Node.js, and MySQL from fundamentals to deployment.',
  45000.00,
  'published',
  @admin_id
)
ON DUPLICATE KEY UPDATE description = VALUES(description);

SET @course_id = (SELECT id FROM courses WHERE slug = 'full-stack-web-development');

-- Modules
INSERT INTO modules (course_id, title, sort_order) VALUES
  (@course_id, 'Getting Started with React', 0),
  (@course_id, 'Backend APIs with Node.js', 1);

SET @mod1_id = (SELECT id FROM modules WHERE course_id = @course_id AND sort_order = 0);
SET @mod2_id = (SELECT id FROM modules WHERE course_id = @course_id AND sort_order = 1);

-- Lessons — module 1
INSERT INTO lessons (module_id, type, title, content_url, duration_seconds, sort_order) VALUES
  (@mod1_id, 'video', 'Introduction to Components', 'https://example.com/videos/react-intro.mp4', 720, 0),
  (@mod1_id, 'notes', 'JSX Cheat Sheet', 'https://example.com/notes/jsx-cheatsheet.pdf', NULL, 1),
  (@mod1_id, 'quiz', 'React Basics Quiz', NULL, NULL, 2);

-- Lessons — module 2
INSERT INTO lessons (module_id, type, title, content_url, duration_seconds, sort_order) VALUES
  (@mod2_id, 'video', 'Building a REST API', 'https://example.com/videos/rest-api.mp4', 900, 0),
  (@mod2_id, 'assignment', 'Build a Notes API', NULL, NULL, 1);

SET @lesson_video1_id = (SELECT id FROM lessons WHERE module_id = @mod1_id AND sort_order = 0);
SET @lesson_quiz_id    = (SELECT id FROM lessons WHERE module_id = @mod1_id AND sort_order = 2);
SET @lesson_video2_id = (SELECT id FROM lessons WHERE module_id = @mod2_id AND sort_order = 0);
SET @lesson_assign_id  = (SELECT id FROM lessons WHERE module_id = @mod2_id AND sort_order = 1);

-- Quiz + questions
INSERT INTO quizzes (lesson_id, title, time_limit_minutes, pass_score)
VALUES (@lesson_quiz_id, 'React Basics Quiz', 10, 60)
ON DUPLICATE KEY UPDATE title = VALUES(title);

SET @quiz_id = (SELECT id FROM quizzes WHERE lesson_id = @lesson_quiz_id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_index, sort_order) VALUES
  (@quiz_id, 'What function do you use to create a component in React?', JSON_ARRAY('useState()', 'function Component()', 'render()', 'createComponent()'), 1, 0),
  (@quiz_id, 'What hook manages local state in a functional component?', JSON_ARRAY('useEffect', 'useState', 'useRef', 'useMemo'), 1, 1),
  (@quiz_id, 'JSX compiles down to calls of which function?', JSON_ARRAY('React.createElement', 'document.createElement', 'ReactDOM.render', 'React.build'), 0, 2);

-- Assignment
INSERT INTO assignments (lesson_id, instructions, due_at, max_score)
VALUES (@lesson_assign_id, 'Build a REST API with CRUD endpoints for notes, backed by MySQL. Submit your repo link.', '2026-08-20 23:59:00', 100)
ON DUPLICATE KEY UPDATE instructions = VALUES(instructions);

SET @assignment_id = (SELECT id FROM assignments WHERE lesson_id = @lesson_assign_id);

-- Batch, trainer assigned
INSERT INTO batches (course_id, trainer_id, name, start_date, end_date)
VALUES (@course_id, @trainer_id, 'Batch A - Aug 2026', '2026-08-01', '2026-11-01');

SET @batch_id = (SELECT id FROM batches WHERE course_id = @course_id AND name = 'Batch A - Aug 2026');

-- Enrollments
INSERT INTO enrollments (student_id, batch_id) VALUES
  (@rohit_id, @batch_id),
  (@priya_id, @batch_id),
  (@karan_id, @batch_id);

-- Lesson progress: Rohit ahead, Priya mid, Karan just started
INSERT INTO lesson_progress (student_id, lesson_id, status, watched_seconds, completed_at) VALUES
  (@rohit_id, @lesson_video1_id, 'completed', 720, NOW()),
  (@rohit_id, @lesson_video2_id, 'completed', 900, NOW()),
  (@priya_id, @lesson_video1_id, 'completed', 720, NOW()),
  (@priya_id, @lesson_video2_id, 'in_progress', 340, NULL),
  (@karan_id, @lesson_video1_id, 'in_progress', 200, NULL);

-- Assignment submission: Rohit submitted and was graded, Priya submitted and awaits grading
INSERT INTO assignment_submissions (assignment_id, student_id, file_url, score, feedback, graded_by, graded_at) VALUES
  (@assignment_id, @rohit_id, 'https://github.com/rohitsharma/notes-api', 92, 'Clean implementation, good error handling.', @trainer_id, NOW());

INSERT INTO assignment_submissions (assignment_id, student_id, file_url) VALUES
  (@assignment_id, @priya_id, 'https://github.com/priyanair/notes-api');

-- Quiz attempt: Rohit passed
INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, passed) VALUES
  (@quiz_id, @rohit_id, JSON_OBJECT(), 100, TRUE);

-- Live session (upcoming)
INSERT INTO live_sessions (batch_id, title, platform, join_url, starts_at, duration_minutes, created_by)
VALUES (@batch_id, 'Week 3: State Management Deep Dive', 'zoom', 'https://zoom.us/j/1234567890', DATE_ADD(NOW(), INTERVAL 3 DAY), 90, @trainer_id);

-- Invoices + partial payments
INSERT INTO invoices (student_id, course_id, total_fee, invoice_no, created_by) VALUES
  (@rohit_id, @course_id, 45000.00, 'INV-2026-00001', @admin_id),
  (@priya_id, @course_id, 45000.00, 'INV-2026-00002', @admin_id),
  (@karan_id, @course_id, 45000.00, 'INV-2026-00003', @admin_id)
ON DUPLICATE KEY UPDATE total_fee = VALUES(total_fee);

SET @inv_rohit_id = (SELECT id FROM invoices WHERE invoice_no = 'INV-2026-00001');
SET @inv_priya_id = (SELECT id FROM invoices WHERE invoice_no = 'INV-2026-00002');
SET @inv_karan_id = (SELECT id FROM invoices WHERE invoice_no = 'INV-2026-00003');

INSERT INTO payments (invoice_id, amount, mode, txn_ref, verified_by) VALUES
  (@inv_rohit_id, 45000.00, 'upi', 'UPI-REF-9001', @admin_id),
  (@inv_priya_id, 25000.00, 'card', 'CARD-REF-9002', @admin_id),
  (@inv_karan_id, 10000.00, 'cash', NULL, @admin_id);

-- Notifications
INSERT INTO notifications (user_id, type, payload) VALUES
  (@rohit_id, 'assignment_due', JSON_OBJECT('message', 'Your submission for "Build a Notes API" was graded: 92/100')),
  (@priya_id, 'class_reminder', JSON_OBJECT('message', 'New live class scheduled: "Week 3: State Management Deep Dive"')),
  (@karan_id, 'payment_reminder', JSON_OBJECT('message', 'Payment of ₹10000 recorded against invoice #INV-2026-00003'));
