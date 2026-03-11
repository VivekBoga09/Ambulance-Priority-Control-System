
// components/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapPopup from "./MapPopup";
import { getActiveTrips, getAllTrips } from "../utils/Api";
import "../App.css";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTrips, setActiveTrips] = useState([]);
  const [allTrips, setAllTrips] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const hospitalUser = JSON.parse(localStorage.getItem("hospitalUser"));
    if (!hospitalUser) navigate("/");
    else {
      setUser(hospitalUser);
      fetchTrips(hospitalUser.hospitalId);
    }
  }, [navigate]);

  async function fetchTrips(hospitalId) {
    const [active, all] = await Promise.all([
      getActiveTrips(hospitalId),
      getAllTrips(hospitalId),
    ]);
    setActiveTrips(active);
    setAllTrips(all);
  }

  const handleLogout = () => {
    localStorage.removeItem("hospitalUser");
    navigate("/");
  };

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      {/* Left: Trip list */}
      <div style={{ flex: 1 }}>
        <header style={{ marginBottom: "20px" }}>
          <h1>🏥 Smart Green Corridor</h1>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
            <span>{user?.name || user?.hospitalId}</span>
            <button onClick={handleLogout} style={{ padding: "8px 15px", borderRadius: "5px", cursor: "pointer", border: "none", background: "#ef4444", color: "white" }}>Logout</button>
          </div>
        </header>

        <h2>Active Trips</h2>
        {activeTrips.length === 0 ? (
          <div className="dashboard-card gradient-orange">
            <h3>No Active Trips</h3>
            <p>Waiting for ambulance dispatch...</p>
          </div>
        ) : (
          activeTrips.map((trip) => (
            <div key={trip.tripId} className="dashboard-card gradient-blue" style={{ marginBottom: "10px" }}>
              <h3>🚑 Ambulance: {trip.ambulanceId}</h3>
              <p><b>Status:</b> {trip.status}</p>
              <p>
                <b>Current:</b>{" "}
                {trip.currentLocation
                  ? `${trip.currentLocation.latitude.toFixed(4)}, ${trip.currentLocation.longitude.toFixed(4)}`
                  : "Location updating..."}
              </p>
              <p>
                <b>Start:</b>{" "}
                {trip.startLocation
                  ? `${trip.startLocation.latitude.toFixed(4)}, ${trip.startLocation.longitude.toFixed(4)}`
                  : "N/A"}
              </p>
              <p><b>Created At:</b> {new Date(trip.createdAt).toLocaleString()}</p>
            </div>
          ))
        )}

        <div className="dashboard-card gradient-purple" style={{ marginTop: "20px" }}>
          <h3>Total Trips: {allTrips.length}</h3>
          <p>Last update: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Right: Map */}
      <div style={{ flex: 1, marginTop: "170px" }}>
        {user && <MapPopup hospital={user} trips={activeTrips} />}
      </div>
    </div>
  );
}

export default Dashboard;
