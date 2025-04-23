document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('new-bottle-form');
    const statusMessage = document.getElementById('status-message');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!form) {
        console.error('Start form not found!');
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        statusMessage.textContent = 'Launching your bottle...';
        statusMessage.className = 'status-message'; // Reset class

        const formData = new FormData(form);

        // Basic client-side validation (check if file is selected)
        const imageInput = document.getElementById('image');
        if (!imageInput.files || imageInput.files.length === 0) {
            statusMessage.textContent = 'Please select an image file.';
            statusMessage.className = 'status-message error';
            submitButton.disabled = false;
            return;
        }

        try {
            const response = await fetch('/api/contribute', {
                method: 'POST',
                body: formData,
                // No 'parent_share_token' needed for starting a new bottle
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! Status: ${response.status}`);
            }

            if (result.success && result.new_share_token) {
                // Redirect to the panel page for the newly created bottle
                window.location.href = `/panel/${result.new_share_token}`;
            } else {
                throw new Error('Failed to create bottle. Server did not return a share token.');
            }

        } catch (error) {
            console.error('Error submitting new bottle:', error);
            statusMessage.textContent = `Error: ${error.message || 'Could not launch bottle.'}`;
            statusMessage.className = 'status-message error';
            submitButton.disabled = false;
        }
    });
}); 