document.addEventListener('DOMContentLoaded', () => {
    const lineageDisplay = document.getElementById('lineage-display');
    const loadingStatus = document.getElementById('panel-loading-status');
    const shareLinkInput = document.getElementById('share-link-input');
    const copyButton = document.getElementById('copy-button');
    const copyStatus = document.getElementById('copy-status');
    // Optionally display root questions on panel page too
    const rootQuestionsDisplay = document.createElement('div');
    rootQuestionsDisplay.id = 'root-questions-display'; 
    rootQuestionsDisplay.style.marginBottom = '20px';
    lineageDisplay.parentNode.insertBefore(rootQuestionsDisplay, lineageDisplay);

    let currentShareToken = null;
    let nextShareLink = '';

    // Function to display root questions
    const renderRootQuestions = (questions) => {
        if (questions && (questions.q1 || questions.q2 || questions.q3)) {
             rootQuestionsDisplay.innerHTML = `<h3>Original Lineage Questions:</h3>
                <ul style="list-style: none; padding-left: 0;">
                    ${questions.q1 ? `<li><strong>Q1:</strong> ${questions.q1}</li>` : ''}
                    ${questions.q2 ? `<li><strong>Q2:</strong> ${questions.q2}</li>` : ''}
                    ${questions.q3 ? `<li><strong>Q3:</strong> ${questions.q3}</li>` : ''}
                </ul>`;
        } else {
            rootQuestionsDisplay.innerHTML = '<h3>Original Lineage Questions:</h3><p><em>None defined.</em></p>';
        }
    };

    // --- 1. Fetch and Display Lineage & Link ---
    const loadLineageAndLink = async () => {
        // Extract the token from the URL path (e.g., /panel/abcdef123)
        const pathSegments = window.location.pathname.split('/');
        currentShareToken = pathSegments[pathSegments.length - 1];

        if (!currentShareToken) {
            loadingStatus.textContent = 'Error: Invalid panel link.';
            loadingStatus.classList.add('error');
            shareLinkInput.value = 'Error generating link.';
            copyButton.disabled = true;
            return;
        }

        // Construct the share link
        nextShareLink = `${window.location.origin}/vault/${currentShareToken}`;
        shareLinkInput.value = nextShareLink;

        try {
            // Fetch the lineage using the same API endpoint as the vault page
            const response = await fetch(`/api/vault/${currentShareToken}`);
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            loadingStatus.style.display = 'none'; // Hide loading message

            // Render the root questions
            renderRootQuestions(result.root_questions);

            // Render the contributions with answers
            if (result.contributions && result.contributions.length > 0) {
                lineageDisplay.innerHTML = ''; // Clear previous content
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
                lineageDisplay.innerHTML = '<p>No contributions found for this vault link.</p>';
            }

        } catch (error) {
            console.error('Error loading vault lineage for panel:', error);
            loadingStatus.textContent = `Error loading vault: ${error.message}`;
            loadingStatus.classList.add('error');
        }
    };

    // --- 2. Copy to Clipboard Functionality ---
    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            copyStatus.textContent = 'Copied!';
            copyButton.textContent = 'Copied!';
            copyButton.disabled = true;
            setTimeout(() => {
                copyStatus.textContent = '';
                copyButton.textContent = 'Copy Link';
                copyButton.disabled = false;
            }, 2500);
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            copyStatus.textContent = 'Auto-copy failed. Please copy manually.';
            shareLinkInput.select();
            shareLinkInput.setSelectionRange(0, 99999);
            setTimeout(() => { copyStatus.textContent = ''; }, 3000);
        });
    };

    // Add event listener to the new copy button
    if(copyButton) {
        copyButton.addEventListener('click', () => copyToClipboard(nextShareLink));
    }

    // Also allow clicking the input field to copy (optional, good UX)
    if(shareLinkInput) {
        shareLinkInput.addEventListener('click', () => copyToClipboard(nextShareLink));
    }

    // --- Initial Load ---
    loadLineageAndLink();
}); 