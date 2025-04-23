const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Specify the path for the database file
const DB_PATH = path.join(__dirname, 'memetic_vault.db');

// Connect to the database (creates the file if it doesn't exist)
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        // If connection fails, log error and exit process
        console.error("FATAL: Error opening database:", err.message);
        process.exit(1); // Exit if DB cannot be opened
    } else {
        console.log('Connected to the SQLite database for initialization.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    const sql = `
      CREATE TABLE IF NOT EXISTS Contributions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          share_token TEXT UNIQUE NOT NULL,
          parent_contribution_id INTEGER,
          lineage_root_id INTEGER,
          image_prompt TEXT,
          image_filename TEXT UNIQUE NOT NULL,
          image_description TEXT,
          survey_question_1 TEXT,
          survey_question_2 TEXT,
          survey_question_3 TEXT,
          survey_answer_1 TEXT,
          survey_answer_2 TEXT,
          survey_answer_3 TEXT,
          contributor_user_agent TEXT,
          latitude REAL,
          longitude REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_contribution_id) REFERENCES Contributions(id),
          FOREIGN KEY (lineage_root_id) REFERENCES Contributions(id)
      );
      CREATE INDEX IF NOT EXISTS idx_share_token ON Contributions(share_token);
    `;

    db.exec(sql, (err) => {
        if (err) {
            console.error("Error initializing database tables:", err.message);
        } else {
            console.log("Database tables initialized successfully.");
        }
        // Close the database connection
        db.close((err) => {
            if (err) {
                console.error("Error closing database:", err.message);
            } else {
                console.log('Initialization script finished: Closed the database connection.');
            }
        });
    });
}