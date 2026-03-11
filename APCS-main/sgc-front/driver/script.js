

const BACKEND_URL = "https://sgc-7zhd.onrender.com"; // adjust for deployment
let map, ambulanceMarker, hospitalMarkers = [], hospitals = [], hospitalMap = {}, tripTimerInterval, routingControl;
let currentPos = { lat: 17.4065, lng: 78.4772 };
let tripActive = false, updateCount = 0, tripStartTime = null;
let tripId = null, currentAmbulance = null;


let tripHistory = JSON.parse(localStorage.getItem('tripHistory') || '[]');

// 🧾 Login (Backend integrated)
async function login() {
    const rc = document.getElementById('rcNumber').value.trim();
    if (!rc) {
        alert('Please enter your RC Number');
        return;
    }

    try {
        const res = await fetch("https://sgc-7zhd.onrender.com/driver/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rcNumber: rc })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Invalid RC Number");
            return;
        }

        currentAmbulance = data.ambulance;
        document.getElementById('driverDisplay').textContent = currentAmbulance.driverName || "Driver";
        document.getElementById('locationSection').classList.add('active');

        // Smooth scroll to location section
        setTimeout(() => {
            document.getElementById('locationSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);

    } catch (err) {
        console.error("Login Error:", err);
        alert("Server not reachable. Check backend.");
    }
}

// 🌍 Location permission
function requestLocation() {
    const statusEl = document.getElementById('locationStatus');
    statusEl.classList.add('active');
    statusEl.textContent = '🔄 Requesting location access...';
    statusEl.classList.remove('success', 'error');

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                statusEl.textContent = '✅ Location access granted! Redirecting to dashboard...';
                statusEl.classList.add('success');

                setTimeout(initDashboard, 1500);
            },
            (error) => {
                statusEl.textContent = '❌ Location access denied. Using default location.';
                statusEl.classList.add('error');
                setTimeout(initDashboard, 2000);
            }
        );
    } else {
        statusEl.textContent = '❌ Geolocation not supported. Using default location.';
        statusEl.classList.add('error');
        setTimeout(initDashboard, 2000);
    }
}

// 🧭 Initialize dashboard
function initDashboard() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('dashboard').classList.add('active');
    document.getElementById('headerRight').classList.remove('hidden');
    loadTripHistory();
    initMap();
    trackLocation();
}

// 📍 Live tracking
function trackLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(pos => {
            currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            updateLocation();
        }, () => updateLocation(), { enableHighAccuracy: true });
    } else {
        updateLocation();
    }
}

// 📌 Update UI map marker
function updateLocation() {
    document.getElementById('currentLat').textContent = currentPos.lat.toFixed(6);
    document.getElementById('currentLng').textContent = currentPos.lng.toFixed(6);
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

    const icon = L.divIcon({
        html: '<div style="font-size:2.5rem;animation:pulse 2s infinite;">🚑</div>',
        className: '',
        iconSize: [50, 50],
        iconAnchor: [25, 50]
    });

    if (ambulanceMarker) {
        ambulanceMarker.setLatLng([currentPos.lat, currentPos.lng]);
    } else {
        ambulanceMarker = L.marker([currentPos.lat, currentPos.lng], { icon }).addTo(map);
    }

    if (!tripActive) map.setView([currentPos.lat, currentPos.lng], 14);
}

// 🗺️ Initialize Map
function initMap() {
    map = L.map('map').setView([currentPos.lat, currentPos.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    var trafficSignalIcon = L.icon({
        iconUrl: 'https://img.icons8.com/plasticine/100/000000/traffic-light.png',
        iconSize: [50, 50],
    });

    L.marker([17.5208, 78.396], { icon: trafficSignalIcon }).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);
    displayHospitals();
}


async function displayHospitals() {
    const select = document.getElementById('hospitalSelect');
    select.innerHTML = '<option value="">-- Select Hospital --</option>';

    // Clear existing markers
    hospitalMarkers.forEach(marker => map.removeLayer(marker));
    hospitalMarkers = [];
    hospitalMap = {}; // reset map

    try {
        // Fetch hospital data from backend
        const res = await fetch(`${BACKEND_URL}/hospital/all`);
        const hospitals = await res.json();

        if (!Array.isArray(hospitals) || hospitals.length === 0) {
            select.innerHTML = '<option value="">No active hospitals found</option>';
            console.warn("⚠️ No hospitals found in Firestore");
            return;
        }

        hospitals.forEach(hospital => {
            // Handle GeoPoint safely
            const lat = hospital.location?.lat || 0;
            const lng = hospital.location?.lng || 0;

            // Calculate distance from current position
            const dist = calcDistance(currentPos.lat, currentPos.lng, lat, lng).toFixed(1);

            // Add option to dropdown using Firestore ID as value
            const opt = document.createElement('option');
            opt.value = hospital.id; // ID matches the map key
            opt.textContent = `${hospital.name} - ${dist} km`;
            select.appendChild(opt);

            // Add hospital to the map keyed by ID
            hospitalMap[hospital.id] = hospital;

            // Create custom marker icon
            const icon = L.divIcon({
                html: `
                    <div style="text-align:center;">
                        <div style="font-size:2.5rem;">🏥</div>
                        <div style="background:white;padding:0.3rem 0.6rem;
                            border-radius:4px;font-size:0.75rem;font-weight:700;
                            color:#48bb78;border:2px solid #48bb78;">
                            ${hospital.name}
                        </div>
                    </div>
                `,
                className: '',
                iconSize: [60, 80],
                iconAnchor: [30, 80]
            });

            // Add marker to map
            const marker = L.marker([lat, lng], { icon }).addTo(map);
            marker.bindPopup(`<strong>${hospital.name}</strong><br>${dist} km away`);
            hospitalMarkers.push(marker);
        });

    } catch (err) {
        console.error("🔥 Error fetching hospitals:", err);
        select.innerHTML = '<option value="">Error loading hospitals</option>';
    }
}

function startTripTimer() {
    tripTimerInterval = setInterval(() => {
        if (!tripActive || !tripStartTime) return; // stop if trip ended

        const elapsedMs = Date.now() - tripStartTime; // milliseconds since start
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);

        // Update the UI element for trip duration
        document.getElementById('tripDuration').textContent = `${minutes}m ${seconds}s`;
    }, 1000);
}


// 📏 Distance Helper
function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 🚀 Start Trip
// async function startTrip() {
//     const idx = document.getElementById('hospitalSelect').value;
//     if (!idx) return alert('Select a hospital');

//     const hospital = hospitals[idx];
//     const payload = {
//         rcNumber: currentAmbulance.rcNumber,
//         hospitalId: hospital.name.replace(/\s/g, "_"),
//         startLocation: { latitude: currentPos.lat, longitude: currentPos.lng }
//     };

//     try {
//         const res = await fetch(`${BACKEND_URL}/driver/start-trip`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(payload)
//         });
//         const data = await res.json();

//         if (res.ok) {
//             tripId = data.tripId;
//             tripActive = true;
//             tripStartTime = Date.now();
//             updateCount = 0;
//             document.getElementById('startBtn').classList.add('hidden');
//             document.getElementById('stopBtn').classList.remove('hidden');
//             document.getElementById('tripStatusText').textContent = "Trip Active";
//             document.querySelector('.status-dot').style.background = '#4299e1';
//             drawRoute(hospital);
//             startLocationUpdates();
//             console.log("🚑 Trip started:", tripId);
//         } else {
//             alert(data.error || "Error starting trip");
//         }
//     } catch (err) {
//         console.error("Start Trip Error:", err);
//         alert("Backend not reachable");
//     }
// }
// 🚀 Start Trip
async function startTrip() {
    const select = document.getElementById('hospitalSelect');
    const hospitalId = select.value; // Firestore ID from dropdown

    if (!hospitalId) {
        return alert("Please select a hospital first");
    }

    // Lookup hospital object in map
    const hospital = hospitalMap[hospitalId];

    if (!hospital) {
        console.error("Selected hospital not found in map", hospitalId);
        return alert("Selected hospital not found");
    }

    // Prepare payload for backend
    const payload = {
        rcNumber: currentAmbulance.rcNumber,
        hospitalId: hospital.id,
        startLocation: { latitude: currentPos.lat, longitude: currentPos.lng }
    };

    try {
        const res = await fetch(`${BACKEND_URL}/driver/start-trip`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            // Trip successfully started
            tripId = data.tripId;
            tripActive = true;
            tripStartTime = Date.now(); 
            startTripTimer();
            updateCount = 0;

            // Update UI
            document.getElementById('startBtn').classList.add('hidden');
            document.getElementById('stopBtn').classList.remove('hidden');
            document.getElementById('tripStatusText').textContent = "Trip Active";
            document.querySelector('.status-dot').style.background = '#4299e1';

            // Draw route and start location updates
            drawRoute(hospital);
            startLocationUpdates();

            console.log("🚑 Trip started:", tripId);
        } else {
            alert(data.error || "Error starting trip");
        }
    } catch (err) {
        console.error("Start Trip Error:", err);
        alert("Backend not reachable");
    }
}



// 🔁 Send periodic location updates
function startLocationUpdates() {
    setInterval(async () => {
        if (!tripActive || !tripId) return;
        updateCount++;
        document.getElementById('updateCount').textContent = updateCount;
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

        const payload = {
            tripId,
            location: {
                latitude: currentPos.lat,
                longitude: currentPos.lng
            }
        };

        try {
            const res = await fetch(`${BACKEND_URL}/driver/update-location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            console.log("📍 Location updated:", data);
        } catch (err) {
            console.warn("Location update failed:", err);
        }
    }, 5000);
}

// 🛑 Stop Trip
function stopTrip() {
    tripActive = false;
    clearInterval(tripTimerInterval);
    if (routingControl) {
        map.removeControl(routingControl);
    }
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
    document.getElementById('tripStatusText').textContent = 'Ready to Start';
    document.querySelector('.status-dot').style.background = '#48bb78';
    console.log("🛑 Trip stopped manually (for MVP)");
}

// 📍 Draw route to hospital
function drawRoute(hospital) {
    if (!hospital || !hospital.location) {
        console.error("Invalid hospital object for route:", hospital);
        return;
    }

    const lat = hospital.location.lat;
    const lng = hospital.location.lng;

    if (lat === undefined || lng === undefined) {
        console.error("Hospital location is invalid:", hospital.location);
        return;
    }

    if (routingControl) {
        map.removeControl(routingControl);
    }

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(currentPos.lat, currentPos.lng),
            L.latLng(lat, lng)
        ],
        routeWhileDragging: true,
        createMarker: function() { return null; }
    }).addTo(map);
}


// 🧾 Trip history loader
function loadTripHistory() {
    const container = document.getElementById('previousTrips');
    if (tripHistory.length === 0) {
        container.innerHTML = `
            <div class="trip-history-item">
                <div class="trip-history-header"><strong>No previous trips</strong></div>
                <div class="trip-history-detail">Complete your first trip to see history</div>
            </div>`;
        return;
    }
    container.innerHTML = tripHistory.slice(-5).reverse().map(trip => `
        <div class="trip-history-item">
            <div class="trip-history-header"><strong>${trip.hospital}</strong></div>
            <div class="trip-history-detail">${trip.date} | Duration: ${trip.duration} | Updates: ${trip.updates}</div>
        </div>`).join('');
}

// 🔐 Logout
function logout() { location.reload(); }

