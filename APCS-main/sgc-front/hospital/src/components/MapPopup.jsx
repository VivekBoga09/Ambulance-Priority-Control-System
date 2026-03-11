// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// const ambulanceIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
//   iconSize: [40, 40],
// });

// function MapPopup({ latitude, longitude, ambulanceName }) {
//   return (
//     <div style={{ height: "400px", width: "100%", borderRadius: "15px" }}>
//       <MapContainer
//         center={[latitude, longitude]}
//         zoom={14}
//         style={{
//           height: "100%",
//           width: "100%",
//           borderRadius: "15px",
//           boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
//         }}
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
//         />
//         <Marker position={[latitude, longitude]} icon={ambulanceIcon}>
//           <Popup>
//             <b>{ambulanceName}</b> 🚑 <br />
//             Currently located here.
//           </Popup>
//         </Marker>
//       </MapContainer>
//     </div>
//   );
// }

// export default MapPopup;





// components/MapPopup.jsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ambulance icon
const ambulanceIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
  iconSize: [40, 40],
});

// Hospital icon (replace URL with your own)
const hospitalIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2966/2966341.png",
  iconSize: [40, 40],
});

function MapPopup({ hospital, trips }) {
  if (!hospital?.location) return null;

  const hospitalLat = hospital.location._latitude;
  const hospitalLng = hospital.location._longitude;

  return (
    <MapContainer
      center={[hospitalLat, hospitalLng]}
      zoom={14}
      style={{
        width: "100%",
        height: "700px", // square size
        borderRadius: "15px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
      />

      {/* Hospital marker */}
      <Marker position={[hospitalLat, hospitalLng]} icon={hospitalIcon}>
        <Popup>
          <b>{hospital.name}</b> 🏥 <br /> Hospital location.
        </Popup>
      </Marker>

      {/* Ambulance markers */}
      {trips.map((trip) =>
        trip.currentLocation ? (
          <Marker
            key={trip.tripId}
            position={[
              trip.currentLocation.latitude,
              trip.currentLocation.longitude,
            ]}
            icon={ambulanceIcon}
          >
            <Popup>
              <b>Ambulance: {trip.ambulanceId}</b> 🚑 <br /> Status: {trip.status}
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}

export default MapPopup;
