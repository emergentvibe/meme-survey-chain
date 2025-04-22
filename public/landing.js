document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('new-lineage-form');
    const statusElement = document.getElementById('new-lineage-status');
    const submitButton = form.querySelector('button[type="submit"]');

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default browser form submission
            statusElement.textContent = 'Submitting...';
            statusElement.className = 'status-message'; // Reset classes
            submitButton.disabled = true;

            const formData = new FormData(form);

            // No parent_share_token is needed when starting a new lineage

            try {
                const response = await fetch('/api/contribute', {
                    method: 'POST',
                    body: formData,
                    // Headers are not needed for FormData, browser sets Content-Type automatically
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    statusElement.textContent = 'Vault created successfully! Redirecting...';
                    statusElement.classList.add('success');
                    // Redirect to the panel page for the new vault
                    window.location.href = `/panel/${result.new_share_token}`;
                } else {
                    // Handle API errors (e.g., validation errors, server errors)
                    statusElement.textContent = `Error: ${result.error || 'Could not start vault.'}`;
                    statusElement.classList.add('error');
                    submitButton.disabled = false; // Re-enable button on error
                }
            } catch (error) {
                // Handle network errors or issues parsing JSON
                console.error('Submission error:', error);
                statusElement.textContent = 'Network error or server unavailable. Please try again.';
                statusElement.classList.add('error');
                submitButton.disabled = false; // Re-enable button on error
            }
        });
    }
}); 