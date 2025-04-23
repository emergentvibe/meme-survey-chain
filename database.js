const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'memetic_vault.db');
let db = null; // Initialize db variable

// Function to establish DB connection, returns a Promise
function connectDb() {
    return new Promise((resolve, reject) => {
        // Check if already connected
        if (db) {
            return resolve(db);
        }

        const instance = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error("Error opening database:", err.message);
                return reject(err); // Reject the promise on connection error
            } else {
                console.log('Connected to the SQLite database for server operations.');
                // Enable foreign keys
                instance.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
                    if (pragmaErr) {
                        console.error("Error enabling foreign keys:", pragmaErr.message);
                        // Decide if this error should prevent startup - let's reject for safety
                        return reject(pragmaErr);
                    }
                    console.log('Foreign key support enabled.');
                    db = instance; // Assign the instance to the module-level variable
                    resolve(db); // Resolve the promise with the db instance
                });
            }
        });
    });
}

// Placeholder functions - we will implement these later
// async function addContribution(data) {
//     // TODO: Implement INSERT logic
//     return Promise.reject(new Error('Not implemented'));
// }
async function addContribution(data) {
    // 1. Insert the main data, omitting lineage_root_id initially
    const insertSql = `INSERT INTO Contributions (
        share_token,
        parent_contribution_id,
        image_prompt,
        image_filename,
        image_description,
        survey_question_1,
        survey_question_2,
        survey_question_3,
        survey_answer_1,
        survey_answer_2,
        survey_answer_3,
        contributor_user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; // 12 placeholders

    const insertParams = [
        data.share_token,
        data.parent_contribution_id,
        data.image_prompt,
        data.image_filename,
        data.image_description,
        data.survey_question_1, // May be NULL for non-root
        data.survey_question_2, // May be NULL for non-root
        data.survey_question_3, // May be NULL for non-root
        data.survey_answer_1,
        data.survey_answer_2,
        data.survey_answer_3,
        data.contributor_user_agent
    ]; // 12 parameters

    console.log('[DB DEBUG] Attempting Step 1 INSERT with SQL:', insertSql);
    console.log('[DB DEBUG] Attempting Step 1 INSERT with PARAMS:', insertParams);

    return new Promise((resolve, reject) => {
        db.run(insertSql, insertParams, function(insertErr) {
            if (insertErr) {
                console.error("Error inserting contribution (step 1):", insertErr.message);
                return reject(insertErr);
            }

            const newId = this.lastID;
            console.log(`[DB DEBUG] Step 1 INSERT successful. New ID: ${newId}`);

            // 2. Determine the correct lineage_root_id
            const lineageRootIdToSet = (data.parent_contribution_id === null)
                ? newId // It's a root node, lineage root is its own ID
                : data.lineage_root_id; // Inherit from parent (this ID was determined in server.js)

            console.log(`[DB DEBUG] Determined lineageRootIdToSet: ${lineageRootIdToSet}`);

            // 3. Update the lineage_root_id for the newly inserted row
            const updateSql = `UPDATE Contributions SET lineage_root_id = ? WHERE id = ?`;
            const updateParams = [lineageRootIdToSet, newId];

            console.log('[DB DEBUG] Attempting Step 2 UPDATE with SQL:', updateSql);
            console.log('[DB DEBUG] Attempting Step 2 UPDATE with PARAMS:', updateParams);

            db.run(updateSql, updateParams, (updateErr) => {
                if (updateErr) {
                    console.error("Error updating lineage_root_id (step 2):", updateErr.message);
                    return reject(updateErr);
                }
                console.log(`[DB DEBUG] Step 2 UPDATE successful for ID: ${newId}`);

                // Resolve with the final data including the correct lineage_root_id
                resolve({ 
                    id: newId, 
                    lineage_root_id: lineageRootIdToSet, 
                    ...data
                }); 
            });
        });
    });
}

// async function findContributionByToken(token) {
//     // TODO: Implement SELECT logic
//     return Promise.reject(new Error('Not implemented'));
// }
async function findContributionByToken(token) {
    const sql = `SELECT * FROM Contributions WHERE share_token = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [token], (err, row) => {
            if (err) {
                console.error("Error finding contribution by token:", err.message);
                return reject(err);
            }
            resolve(row); // Resolves with the row data (object) or undefined if not found
        });
    });
}

// async function getLineage(startToken) {
//     // TODO: Implement recursive SELECT logic
//     return Promise.reject(new Error('Not implemented'));
// }
async function getLineage(startToken) {
    try {
        const startContribution = await findContributionByToken(startToken);
        if (!startContribution) {
            return null; // Return null if start token not found
        }

        const lineage = [startContribution];
        let currentContribution = startContribution;

        // Walk up the chain to get ancestors
        while (currentContribution.parent_contribution_id !== null) {
            const parentContribution = await findContributionById(currentContribution.parent_contribution_id);
            if (!parentContribution) {
                console.error(`Data integrity issue: Parent ${currentContribution.parent_contribution_id} not found for ${currentContribution.id}`);
                break; // Return partial lineage found so far
            }
            lineage.unshift(parentContribution);
            currentContribution = parentContribution;
        }

        // Now fetch the root contribution details to get the questions
        const rootId = lineage[0].lineage_root_id; // Root ID is stored on all contributions
        let rootQuestions = { q1: null, q2: null, q3: null };
        let imagePrompt = null; // Variable for image prompt

        if (rootId) { // Should always exist if lineage exists
            const rootContribution = await findContributionById(rootId);
            if (rootContribution) {
                rootQuestions = {
                    q1: rootContribution.survey_question_1,
                    q2: rootContribution.survey_question_2,
                    q3: rootContribution.survey_question_3
                };
                imagePrompt = rootContribution.image_prompt; // Get image prompt from root
            } else {
                console.error(`Data integrity issue: Root contribution ${rootId} not found.`);
            }
        }

        // Return lineage, root questions, and image prompt
        return { 
            contributions: lineage, 
            root_questions: rootQuestions, 
            image_prompt: imagePrompt // Add image prompt to result
        }; 

    } catch (error) {
        console.error("Error getting lineage:", error);
        throw error; // Re-throw the error to be handled by the API endpoint
    }
}

// async function findContributionById(id) {
//     // TODO: Implement SELECT logic
//     return Promise.reject(new Error('Not implemented'));
// }
async function findContributionById(id) {
    const sql = `SELECT * FROM Contributions WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error("Error finding contribution by ID:", err.message);
                return reject(err);
            }
            resolve(row); // Resolves with the row data (object) or undefined if not found
        });
    });
}

module.exports = {
    // db, // Don't export the raw DB instance directly initially
    connectDb, // Export the connection function
    addContribution,
    findContributionByToken,
    getLineage,
    findContributionById
}; 