document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the map and set its view to a default location and zoom
    const map = L.map('map').setView([20, 0], 2); // Centered roughly, low zoom

    // Add a tile layer (map background) from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Fetch the latest contribution data
    try {
        const response = await fetch('/api/map/latest');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const contributions = await response.json();

        if (contributions && contributions.length > 0) {
            console.log(`Received ${contributions.length} contributions for map.`);
            contributions.forEach(contrib => {
                // Check if latitude and longitude are valid numbers
                if (typeof contrib.latitude === 'number' && typeof contrib.longitude === 'number') {
                    const marker = L.marker([contrib.latitude, contrib.longitude]).addTo(map);
                    
                    // Add a popup to the marker
                    let popupContent = `<b>Bottle #${contrib.id}</b><br>`;
                    if (contrib.image_description) {
                        // Basic escaping for description - more robust solution needed for production
                        const escapedDesc = contrib.image_description.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        popupContent += `${escapedDesc}<br>`;
                    }
                    // Add link to the panel page
                    popupContent += `<a href="/panel/${contrib.share_token}" target="_blank">View Lineage</a>`;
                    
                    marker.bindPopup(popupContent);
                } else {
                    console.warn(`Skipping contribution ID ${contrib.id} due to invalid coordinates:`, contrib.latitude, contrib.longitude);
                }
            });
        } else {
            console.log('No contribution data received for the map.');
            // Optionally display a message on the page if no data
        }

    } catch (error) {
        console.error('Error fetching or displaying map data:', error);
        // Optionally display an error message to the user on the page
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerHTML = '<p style="text-align:center; color:red;">Could not load map data. Please try again later.</p>';
        }
    }
}); 