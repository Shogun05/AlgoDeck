export const CREATE_QUESTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'Medium',
    tags TEXT NOT NULL DEFAULT '[]',
    screenshot_path TEXT NOT NULL DEFAULT '',
    ocr_text TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_reviewed TEXT,
    next_review_date TEXT,
    interval REAL NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    repetition INTEGER NOT NULL DEFAULT 0
  );
`;

export const CREATE_SOLUTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    tier TEXT NOT NULL DEFAULT 'brute',
    code TEXT NOT NULL DEFAULT '',
    explanation TEXT NOT NULL DEFAULT '',
    time_complexity TEXT NOT NULL DEFAULT '',
    space_complexity TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );
`;

export const CREATE_REVISION_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS revision_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    rating TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );
`;

export const CREATE_OCR_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_questions_ocr_text ON questions(ocr_text);
`;

export const CREATE_NEXT_REVIEW_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_questions_next_review ON questions(next_review_date);
`;

export const ALL_MIGRATIONS = [
    CREATE_QUESTIONS_TABLE,
    CREATE_SOLUTIONS_TABLE,
    CREATE_REVISION_LOGS_TABLE,
    CREATE_OCR_INDEX,
    CREATE_NEXT_REVIEW_INDEX,
];
