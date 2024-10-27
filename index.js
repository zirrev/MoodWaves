const clientId = '9edc556e2bc94f90b9ffabf847b1d3c3'; // Replace with your Spotify Client ID
const redirectUri = 'http://localhost:5500'; // Replace with your redirect URI

// Function to generate the Spotify login URL
const getSpotifyLoginURL = () => {
    const scopes = [
        'playlist-modify-public',
        'playlist-modify-private',
        'user-read-private',
        'user-read-email'
    ];
    
    const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&scope=${encodeURIComponent(scopes.join(' '))}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return authUrl;
};

// Check if there is an access token in the URL hash
const getAccessTokenFromUrl = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
};

// Redirect to Spotify login
document.getElementById('login').addEventListener('click', () => {
    window.location.href = getSpotifyLoginURL();
});

// Once we have the access token, enable the app
const accessToken = getAccessTokenFromUrl();
if (accessToken) {
    document.getElementById('login').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

const moodToTrackFeatures = (mood) => {
    const moods = {
        happy: { valence: 0.8, energy: 0.7 },
        sad: { valence: 0.3, energy: 0.2 },
        relaxed: { valence: 0.6, energy: 0.4 },
        energetic: { valence: 0.7, energy: 0.9 }
    };
    return moods[mood.toLowerCase()] || moods['happy'];
};

// Create the playlist based on the mood
document.getElementById('create-playlist').addEventListener('click', async () => {
    const mood = document.getElementById('mood').value;
    if (!mood) {
        alert('Please enter a mood!');
        return;
    }

    const trackFeatures = moodToTrackFeatures(mood);

    // Fetch recommended tracks from Spotify
    try {
        const recommendationsResponse = await fetch(
            `https://api.spotify.com/v1/recommendations?seed_genres=pop&min_valence=${trackFeatures.valence}&max_valence=${trackFeatures.valence + 0.2}&min_energy=${trackFeatures.energy}&max_energy=${trackFeatures.energy + 0.2}&limit=20`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        const recommendations = await recommendationsResponse.json();
        const trackUris = recommendations.tracks.map(track => track.uri);

        // Fetch the user's profile to get their ID
        const userProfileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const userProfile = await userProfileResponse.json();

        // Create a new playlist
        const createPlaylistResponse = await fetch(
            `https://api.spotify.com/v1/users/${userProfile.id}/playlists`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `Mood Playlist: ${mood}`,
                    public: true
                })
            }
        );
        const newPlaylist = await createPlaylistResponse.json();

        // Add tracks to the new playlist
        await fetch(
            `https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: trackUris
                })
            }
        );

        document.getElementById('result').innerText = `Playlist "${newPlaylist.name}" created successfully!`;
    } catch (error) {
        console.error('Error creating playlist:', error);
        document.getElementById('result').innerText = 'Failed to create playlist. Check the console for details.';
    }
});

document.getElementById('logout').addEventListener('click', () => {
    // Clear the local access token (assuming it's stored in localStorage or sessionStorage)
    localStorage.removeItem('spotifyAccessToken');
    sessionStorage.removeItem('spotifyAccessToken');

    // Optionally, redirect to Spotify's logout page
    window.location.href = 'https://accounts.spotify.com/logout';
    
    // Optionally, redirect back to your app's login page after a few seconds
    setTimeout(() => {
        window.location.href = 'http://localhost:5500';  // Adjust to your app's base URL
    }, 1000);  // 1-second delay to ensure logout completes
});

