document.addEventListener('DOMContentLoaded', () => {
    const lineageDisplay = document.getElementById('lineage-display');
    const loadingStatus = document.getElementById('vault-loading-status');
    const form = document.getElementById('contribution-form');
    const contributionStatus = document.getElementById('contribution-status');
    const surveyQuestionsDisplay = document.getElementById('survey-questions-display');
    const imagePromptText = document.getElementById('prompt-text');
    const submitButton = form.querySelector('button[type="submit"]');

    let currentShareToken = null;

    // Function to render the survey questions and answer fields
    const renderSurvey = (questions) => {
        if (!questions || (!questions.q1 && !questions.q2 && !questions.q3)) {
            surveyQuestionsDisplay.innerHTML = '<p>No survey questions defined for this lineage.</p>';
            return;
        }
        surveyQuestionsDisplay.innerHTML = '<h5>Answer the lineage questions:</h5>'; // Clear loading message
        for (let i = 1; i <= 3; i++) {
            const qKey = `q${i}`;
            const aKey = `surveyAnswer${i}`;
            if (questions[qKey]) { // Only render if question exists
                const questionGroup = document.createElement('div');
                questionGroup.className = 'form-group';
                questionGroup.innerHTML = `
                    <label for="${aKey}">${questions[qKey]}</label>
                    <input type="text" id="${aKey}" name="${aKey}">
                `;
                surveyQuestionsDisplay.appendChild(questionGroup);
            }
        }
    };

    // --- 1. Fetch and Display Lineage & Survey ---
    const loadLineageAndSurvey = async () => {
        // Extract the token from the URL path (e.g., /vault/abcdef123)
        const pathSegments = window.location.pathname.split('/');
        currentShareToken = pathSegments[pathSegments.length - 1];

        if (!currentShareToken) {
            loadingStatus.textContent = 'Error: Invalid vault link.';
            loadingStatus.classList.add('error');
            form.style.display = 'none'; // Hide form if link is invalid
            return;
        }

        try {
            const response = await fetch(`/api/vault/${currentShareToken}`);
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json(); // Expect { image_prompt: "...", root_questions: {}, contributions: [] }
            loadingStatus.style.display = 'none'; // Hide loading message

            // Display the image prompt
            if (imagePromptText) {
                imagePromptText.textContent = result.image_prompt || 'No specific prompt provided.';
            }

            // Render the survey questions first
            renderSurvey(result.root_questions);

            // Render the contributions
            if (result.contributions && result.contributions.length > 0) {
                lineageDisplay.innerHTML = ''; // Clear previous content if any
                result.contributions.forEach((contrib, index) => {
                    const contributionElement = document.createElement('div');
                    contributionElement.className = 'contribution-item';
                    // Display answers in the lineage view
                    let answersHtml = '<p><strong>Answers:</strong><ul style="margin-top: 5px;">';
                    answersHtml += `<li>Q1: ${contrib.answers.a1 || '<em>N/A</em>'}</li>`;
                    answersHtml += `<li>Q2: ${contrib.answers.a2 || '<em>N/A</em>'}</li>`;
                    answersHtml += `<li>Q3: ${contrib.answers.a3 || '<em>N/A</em>'}</li>`;
                    answersHtml += '</ul></p>';

                    contributionElement.innerHTML = `
                        <h4>Contribution #${index + 1}</h4>
                        <img src="/uploads/${contrib.image_filename}" alt="Contribution ${index + 1}" style="max-width: 100%; height: auto; margin-bottom: 10px;">
                        <p><strong>Description:</strong> ${contrib.image_description || 'N/A'}</p>
                        ${answersHtml}
                        <p><small>Timestamp: ${new Date(contrib.timestamp).toLocaleString()}</small></p>
                        <hr style="margin: 15px 0;">
                    `;
                    lineageDisplay.appendChild(contributionElement);
                });
            } else {
                lineageDisplay.innerHTML = '<p>No contributions found for this vault yet.</p>';
            }

        } catch (error) {
            console.error('Error loading vault:', error);
            loadingStatus.textContent = `Error loading vault: ${error.message}`;
            loadingStatus.classList.add('error');
            form.style.display = 'none'; // Hide form on error
        }
    };

    // --- 2. Handle Contribution Form Submission ---
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            contributionStatus.textContent = 'Submitting contribution...';
            contributionStatus.className = 'status-message'; // Reset classes
            submitButton.disabled = true;

            if (!currentShareToken) {
                contributionStatus.textContent = 'Error: Cannot contribute without a valid vault link.';
                contributionStatus.classList.add('error');
                submitButton.disabled = false;
                return;
            }

            const formData = new FormData(form);
            // IMPORTANT: Add the parent share token to the form data
            formData.append('parent_share_token', currentShareToken);

            try {
                const response = await fetch('/api/contribute', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    contributionStatus.textContent = 'Contribution added successfully! Redirecting...';
                    contributionStatus.classList.add('success');
                    // Redirect to the panel page for the *new* vault state
                    window.location.href = `/panel/${result.new_share_token}`;
                } else {
                    contributionStatus.textContent = `Error: ${result.error || 'Could not add contribution.'}`;
                    contributionStatus.classList.add('error');
                    submitButton.disabled = false;
                }
            } catch (error) {
                console.error('Contribution submission error:', error);
                contributionStatus.textContent = 'Network error or server unavailable. Please try again.';
                contributionStatus.classList.add('error');
                submitButton.disabled = false;
            }
        });
    }

    // --- Initial Load ---
    loadLineageAndSurvey(); // Renamed function call
}); 