const express = require("express");
const router = express.Router();
const db = require("../config/firestore");

// Driver login
router.post("/login", async (req, res) => {
  try {
    const { rcNumber } = req.body;

    if (!rcNumber) {
      return res.status(400).json({ error: "RC number required" });
    }

    // Make sure to query the correct field name
    const snapshot = await db
      .collection("ambulances ")
      .where("rcNumber", "==", rcNumber)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ error: "Invalid RC number" });
    }

    let ambulanceData;
    snapshot.forEach(doc => {
      ambulanceData = { id: doc.id, ...doc.data() };
    });

    return res.json({ message: "Login successful", ambulance: ambulanceData });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});


// Start trip
router.post("/start-trip", async (req, res) => {
  try {
    const { rcNumber, hospitalId, startLocation } = req.body;

    if (!rcNumber || !hospitalId || !startLocation) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check ambulance exists
    const ambSnapshot = await db
      .collection("ambulances ")
      .where("rcNumber", "==", rcNumber)
      .get();

    if (ambSnapshot.empty) {
      return res.status(401).json({ error: "Invalid ambulance RC number" });
    }

    let ambulanceId;
    ambSnapshot.forEach(doc => (ambulanceId = doc.id));

    // Create trip in Firestore
    const tripRef = await db.collection("trips").add({
      ambulanceId,
      hospitalId,
      startLocation,   // store as { latitude, longitude }
      status: "active",
      createdAt: new Date().toISOString(),
    });

    return res.json({
      message: "Trip started",
      tripId: tripRef.id,
      status: "active",
    });
  } catch (error) {
    console.error("🔥 Error in /start-trip:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Update trip location
router.post("/update-location", async (req, res) => {
  try {
    const { tripId, location } = req.body;

    if (!tripId || !location) {
      return res.status(400).json({ error: "tripId and location are required" });
    }

    // Update Firestore trip doc
    await db.collection("trips").doc(tripId).update({
      currentLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      message: "Location updated",
      tripId,
    });
  } catch (error) {
    console.error("🔥 Error in /update-location:", error);
    return res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;
