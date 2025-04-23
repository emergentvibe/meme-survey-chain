const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
// Import connectDb function instead of the raw db object initially
const dbOps = require('./database');
// const apiRoutes = require('./routes/api'); // Optional route structuring

const app = express();
const PORT = process.env.PORT || 3000;

// --- Multer Setup for File Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Store files in the 'uploads' directory
    },
    filename: function (req, file, cb) {
        // Generate a unique filename: uuid + original extension
        const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueFilename);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // Increase limit to 10MB

// Middleware
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded images

// --- HTML Page Routes ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/vault/:share_token', (req, res) => {
    // Basic check: ensure token looks reasonable before serving page
    // Actual validation happens via API call from client-side JS
    // TODO: Add basic token format validation if desired
    res.sendFile(path.join(__dirname, 'public', 'vault.html'));
});
app.get('/panel/:share_token', (req, res) => {
    // TODO: Add basic token format validation if desired
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// --- API Routes ---
// Define endpoints here or use router: app.use('/api', apiRoutes);

app.post('/api/contribute', upload.single('image'), async (req, res) => {
    // upload.single('image') middleware handles the file upload
    // The 'image' string matches the name attribute of the file input in the form
    try {
        const { 
            description, 
            parent_share_token, 
            // Extract new survey fields
            surveyQuestion1, surveyQuestion2, surveyQuestion3,
            surveyAnswer1, surveyAnswer2, surveyAnswer3,
            imagePrompt // Extract image prompt
        } = req.body;

        // --- Validation ---
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Image file is required.' });
        }
        // TODO: Add more validation for description, survey answers if needed

        // --- Determine Parent / Lineage Root ---
        let parentContributionId = null;
        let lineageRootId = null;

        if (parent_share_token) {
            // Use the function we just implemented
            // Note: Ensure dbOps is accessible here. If db is needed directly,
            // ensure connectDb has resolved first.
            const parentContribution = await dbOps.findContributionByToken(parent_share_token);
            if (!parentContribution) {
                // Ensure the file is removed if parent is invalid to avoid orphaned uploads
                if (req.file) {
                    const fs = require('fs');
                    fs.unlink(req.file.path, (err) => { if(err) console.error("Error deleting file after failed contribution:", err); });
                }
                return res.status(404).json({ success: false, error: 'Parent vault not found.' });
            }
            parentContributionId = parentContribution.id;
            lineageRootId = parentContribution.lineage_root_id; // Get lineage root from parent
        } // If no parent_share_token, parentContributionId remains null, lineageRootId remains null (will be set in DB)

        // --- Generate New Token ---
        const newShareToken = crypto.randomBytes(16).toString('hex');

        // --- Prepare Data for DB ---
        const contributionData = {
            share_token: newShareToken,
            parent_contribution_id: parentContributionId,
            lineage_root_id: lineageRootId, // Pass the determined lineage root ID (can be null for new roots)
            image_prompt: imagePrompt || null, // Add image prompt (null if not provided/not root)
            image_filename: req.file.filename,
            image_description: description || '',
            // Pass survey questions (will be undefined/null if not a root submission)
            survey_question_1: surveyQuestion1 || null,
            survey_question_2: surveyQuestion2 || null,
            survey_question_3: surveyQuestion3 || null,
            // Pass survey answers
            survey_answer_1: surveyAnswer1 || '',
            survey_answer_2: surveyAnswer2 || '',
            survey_answer_3: surveyAnswer3 || '',
            contributor_user_agent: req.headers['user-agent'] || 'Unknown'
        };

        // --- Save to DB ---
        console.log('[SERVER DEBUG] Calling addContribution with data:', contributionData);
        // Use the function we implemented
        const newContribution = await dbOps.addContribution(contributionData);

        // --- Respond ---
        res.status(201).json({
            success: true,
            new_share_token: newContribution.share_token,
            new_image_url: `/uploads/${newContribution.image_filename}` // Provide relative URL
        });

    } catch (error) {
        console.error("Error in /api/contribute:", error);
        // Handle specific errors (like DB errors, token generation errors) if needed
        // If multer fileFilter rejected the file, error might be caught here too
        // Also, clean up uploaded file on error if it exists
        if (req.file) {
            const fs = require('fs');
            // Use unlinkSync for simplicity in error handler, or manage async properly
            try { fs.unlinkSync(req.file.path); } catch (e) { console.error("Error cleaning up file:", e); }
        }
        if (error.message && error.message.includes('Not an image')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Could not save contribution.' });
    }
});

app.get('/api/vault/:share_token', async (req, res) => {
    try {
        const { share_token } = req.params;

        if (!share_token) {
            return res.status(400).json({ error: "Share token is required." });
        }

        const result = await dbOps.getLineage(share_token);

        if (!result || !result.contributions || result.contributions.length === 0) {
            return res.status(404).json({ error: "Vault not found." });
        }

        // Restructure the contributions to have a nested answers object
        const formattedContributions = result.contributions.map(contrib => {
            return {
                id: contrib.id,
                share_token: contrib.share_token, // Keep token if needed on frontend?
                parent_contribution_id: contrib.parent_contribution_id,
                lineage_root_id: contrib.lineage_root_id,
                image_filename: contrib.image_filename,
                image_description: contrib.image_description,
                contributor_user_agent: contrib.contributor_user_agent,
                timestamp: contrib.timestamp,
                answers: {
                    a1: contrib.survey_answer_1,
                    a2: contrib.survey_answer_2,
                    a3: contrib.survey_answer_3
                }
                // Exclude original survey_answer_N and survey_question_N fields
            };
        });

        // We have the lineage, root questions, and image prompt; send them back
        res.status(200).json({
            image_prompt: result.image_prompt, // Add the image prompt
            root_questions: result.root_questions, // Already in { q1, q2, q3 } format
            contributions: formattedContributions
        });

    } catch (error) {
        console.error("Error in /api/vault/:share_token:", error);
        res.status(500).json({ error: "Server error retrieving vault." });
    }
});

// Example: app.get('/api/vault/:share_token', /* handler */);

// --- Basic Error Handler Middleware ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// --- Server Startup Function ---
async function startServer() {
    try {
        console.log('Attempting to connect to database...');
        await dbOps.connectDb(); // Wait for DB connection
        console.log('Database connection successful.');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Server is ready and listening.');

            // Force the event loop to stay active (for debugging)
            setInterval(() => {
                // console.log('Server alive...'); // Optional: uncomment to see heartbeat
            }, 1000 * 60 * 5); // Run every 5 minutes (long interval)
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1); // Exit if DB connection fails
    }
}

// Add a global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
  // Consider exiting the process for unknown errors
  // process.exit(1);
});

// --- Start the server ---
startServer(); 