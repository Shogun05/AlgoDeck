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
    notebook_id INTEGER DEFAULT NULL,
    created_at TEXT NOT NULL,
    last_reviewed TEXT,
    next_review_date TEXT,
    interval REAL NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    repetition INTEGER NOT NULL DEFAULT 0
  );
`;

export const CREATE_NOTEBOOKS_TABLE = `
  CREATE TABLE IF NOT EXISTS notebooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#a985ff',
    created_at TEXT NOT NULL
  );
`;

export const ADD_NOTEBOOK_ID_COLUMN = `
  ALTER TABLE questions ADD COLUMN notebook_id INTEGER DEFAULT NULL;
`;

export const CREATE_SOLUTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    tier TEXT NOT NULL DEFAULT 'brute',
    language TEXT NOT NULL DEFAULT 'python',
    code TEXT NOT NULL DEFAULT '',
    explanation TEXT NOT NULL DEFAULT '',
    time_complexity TEXT NOT NULL DEFAULT '',
    space_complexity TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );
`;

// Add language column to existing databases (safe to run multiple times)
export const ADD_LANGUAGE_COLUMN = `
  ALTER TABLE solutions ADD COLUMN language TEXT NOT NULL DEFAULT 'python';
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

// ─── FTS5 INVERTED INDEX ──────────────────────────────────────
// External-content FTS5 table backed by questions.
// This is the actual inverted index used for full-text search
// across title, tags, ocr_text, and notes.
export const CREATE_FTS_TABLE = `
  CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
    title,
    tags,
    ocr_text,
    notes,
    content=questions,
    content_rowid=id
  );
`;

// Triggers to keep the FTS inverted index in sync with questions
export const CREATE_FTS_INSERT_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS questions_fts_insert AFTER INSERT ON questions BEGIN
    INSERT INTO questions_fts(rowid, title, tags, ocr_text, notes)
    VALUES (new.id, new.title, new.tags, new.ocr_text, new.notes);
  END;
`;

export const CREATE_FTS_DELETE_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS questions_fts_delete AFTER DELETE ON questions BEGIN
    INSERT INTO questions_fts(questions_fts, rowid, title, tags, ocr_text, notes)
    VALUES('delete', old.id, old.title, old.tags, old.ocr_text, old.notes);
  END;
`;

export const CREATE_FTS_UPDATE_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS questions_fts_update AFTER UPDATE ON questions BEGIN
    INSERT INTO questions_fts(questions_fts, rowid, title, tags, ocr_text, notes)
    VALUES('delete', old.id, old.title, old.tags, old.ocr_text, old.notes);
    INSERT INTO questions_fts(rowid, title, tags, ocr_text, notes)
    VALUES (new.id, new.title, new.tags, new.ocr_text, new.notes);
  END;
`;

// Rebuild command — call after bulk imports to re-index everything
export const REBUILD_FTS = `
  INSERT INTO questions_fts(questions_fts) VALUES('rebuild');
`;

export const ALL_MIGRATIONS = [
    CREATE_QUESTIONS_TABLE,
    CREATE_NOTEBOOKS_TABLE,
    CREATE_SOLUTIONS_TABLE,
    CREATE_REVISION_LOGS_TABLE,
    CREATE_OCR_INDEX,
    CREATE_NEXT_REVIEW_INDEX,
];

// FTS migrations run separately with error handling (FTS5 may not be
// available on every SQLite build).
export const FTS_MIGRATIONS = [
    CREATE_FTS_TABLE,
    CREATE_FTS_INSERT_TRIGGER,
    CREATE_FTS_DELETE_TRIGGER,
    CREATE_FTS_UPDATE_TRIGGER,
    REBUILD_FTS,
];
