const express = require("express");
const router = express.Router();
const db = require("../config/firestore");

// Mock queue length (in meters) – adjust as needed
const QUEUE_LENGTH = 0;

if(QUEUE_LENGTH > 0){
  QUEUE_LENGTH = QUEUE_LENGTH - 200;
}

// Utility: Signed distance in meters
function getSignedDistanceMeters(ambLoc, inter) {
  const lat1 = inter.location.latitude ?? inter.location._latitude;
  const lon1 = inter.location.longitude ?? inter.location._longitude;

  // Optional "next point" to determine road direction
  const lat2 = inter.nextLocation?.latitude ?? (lat1 + 0.0001);
  const lon2 = inter.nextLocation?.longitude ?? (lon1 + 0.0001);

  // Vector from intersection → next road point
  const dx = lon2 - lon1;
  const dy = lat2 - lat1;

  // Vector from intersection → ambulance
  const ax = ambLoc.longitude - lon1;
  const ay = ambLoc.latitude - lat1;

  // Project ambulance onto road vector
  const dot = ax * dx + ay * dy;
  const lenSq = dx * dx + dy * dy;
  const proj = dot / lenSq;

  // Convert degrees → meters (approx)
  const lengthMeters = Math.sqrt(lenSq) * 111139;

  return proj * lengthMeters; // signed distance
}

// 🚑 Start Trip
router.post("/start", async (req, res) => {
  try {
    const { ambulanceId, hospitalId, startLocation } = req.body;
    if (!ambulanceId || !hospitalId || !startLocation) {
      return res.status(400).json({ error: "ambulanceId, hospitalId, startLocation required" });
    }

    const tripRef = await db.collection("trips").add({
      ambulanceId,
      hospitalId,
      startLocation,
      status: "active",
      passedIntersections: {}, // state tracking
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ message: "Trip started", tripId: tripRef.id });
  } catch (err) {
    console.error("Error starting trip:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📍 Update Location (Time-based signal logic)
router.post("/updateLocation", async (req, res) => {
  try {
    const { tripId, location } = req.body;
    if (!tripId || !location)
      return res.status(400).json({ error: "tripId & location required" });

    const tripRef = db.collection("trips").doc(tripId);
    const tripSnap = await tripRef.get();
    if (!tripSnap.exists)
      return res.status(404).json({ error: "Trip not found" });

    const tripData = tripSnap.data();

    // 🔄 Broadcast to hospital clients if any
    const hospitalId = tripData.hospitalId;
    if (global.hospitalClients && global.hospitalClients[hospitalId]) {
      global.hospitalClients[hospitalId].forEach((client) => {
        client.send(
          JSON.stringify({
            event: "locationUpdate",
            tripId,
            ambulanceId: tripData.ambulanceId,
            location,
          })
        );
      });
    }

    // Keep your existing intersection tracking logic (optional)
    const intersections = await db.collection("intersectons").get();
    let passedIntersections = tripData.passedIntersections || {};

    for (const doc of intersections.docs) {
      const inter = doc.data();
      const distance = getSignedDistanceMeters(location, inter);

      const state = passedIntersections[inter.intersectionId] || {
        activated: false,
        readyToReset: false,
        passed: false,
      };

      // Keep normal signal logic working for other cases (optional)
      if (!state.activated && distance < 0 && Math.abs(distance) <= (QUEUE_LENGTH + 200)) {
        await db.collection("intersectons").doc(doc.id).update({
          signalStatus: "Green",
          lastActivatedAt: new Date(),
        });
        state.activated = true;
      }

      if (state.activated && !state.readyToReset && distance >= 0 && distance <= 50) {
        state.readyToReset = true;
      }

      if (state.activated && !state.passed && distance > 50) {
        await db.collection("intersectons").doc(doc.id).update({
          signalStatus: "Red",
        });
        state.passed = true;
      }

      passedIntersections[inter.intersectionId] = state;
    }

    await tripRef.update({ passedIntersections });
    res.json({ message: "Location updated", elapsedSec, signal: newStatus });
  } catch (err) {
    console.error("Error updating location:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// 🏁 Complete Trip
router.post("/complete", async (req, res) => {
  try {
    const { tripId } = req.body;
    if (!tripId) return res.status(400).json({ error: "tripId required" });

    const tripRef = db.collection("trips").doc(tripId);
    const tripSnap = await tripRef.get();
    if (!tripSnap.exists) return res.status(404).json({ error: "Trip not found" });

    await tripRef.update({ status: "completed", completedAt: new Date() });
    res.json({ message: "Trip completed" });
  } catch (err) {
    console.error("Error completing trip:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🚦 Get all intersections with signal status
router.get("/intersections", async (req, res) => {
  try {
    const snapshot = await db.collection("intersectons").get(); // your Firestore collection name

    if (snapshot.empty) {
      return res.json([]);
    }

    const intersections = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      intersections.push({
        id: doc.id,
        intersectionId: data.intersectionId || doc.id,
        signalStatus: data.signalStatus || "Red",
        latitude: data.location?.latitude || null,
        longitude: data.location?.longitude || null,
      });
    });

    return res.json(intersections);
  } catch (error) {
    console.error("🔥 Error fetching intersections:", error);
    return res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;