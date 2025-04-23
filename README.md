# Message in a Bottle

A simple web application built as a social experiment to track the propagation of a collaborative "message in a bottle" through direct, person-to-person sharing.

## Concept

Users can either:
1.  Start a new "bottle" (lineage) by submitting an initial image, setting 3 survey questions, and answering them.
2.  Receive a unique link to an existing bottle, view its journey (images, descriptions, answers), and contribute their own image and answers to the original survey questions.

Each contribution generates a new unique link, allowing the bottle's path to be traced as it's passed along.

## Tech Stack (MVP)

*   **Frontend:** Vanilla HTML, CSS, JavaScript
*   **Backend:** Node.js, Express.js
*   **Database:** SQLite
*   **File Storage:** Server's local filesystem (`uploads/` directory)
*   **Dependencies:** `express`, `sqlite3`, `multer`, `uuid`

## Local Setup & Running

1.  **Prerequisites:**
    *   Node.js (v18 or later recommended)
    *   npm (usually included with Node.js)

2.  **Clone/Download:** Obtain the project files.

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Initialize Database:** Create the database file and table structure. If `memetic_vault.db` already exists, you might want to remove it first (`rm memetic_vault.db`) to ensure the latest schema is used.
    ```bash
    node init_db.js
    ```
    *(Check the output for success messages)*

5.  **Run the Server:**
    ```bash
    npm start
    ```
    *(The server should log that it's running on port 3000 and connected to the database)*

6.  **Access the App:** Open your web browser and go to `http://localhost:3000`.

# Memetic Vault Specific
memetic_vault.db
memetic_vault.db-journal # SQLite temporary file
uploads/