// const express = require("express");
// const router = express.Router();
// const db = require("../config/firestore");

// // 🏥 Hospital login
// router.post("/login", async (req, res) => {
//   try {
//     const { hospitalId } = req.body;

//     if (!hospitalId) {
//       return res.status(400).json({ error: "Hospital ID required" });
//     }

//     const snapshot = await db
//       .collection("hospitals")
//       .where("hospitalId", "==", hospitalId)
//       .get();

//     if (snapshot.empty) {
//       return res.status(401).json({ error: "Invalid hospital ID" });
//     }

//     let hospitalData;
//     snapshot.forEach((doc) => {
//       hospitalData = { id: doc.id, ...doc.data() };
//     });

//     return res.json({ message: "Login successful", hospital: hospitalData });
//   } catch (error) {
//     console.error("🔥 Error in /hospital/login:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// });

// // 🚑 Get all **active** trips for a hospital
// router.get("/trips/active/:hospitalId", async (req, res) => {
//   try {
//     const { hospitalId } = req.params;

//     const snapshot = await db
//       .collection("trips")
//       .where("hospitalId", "==", hospitalId)
//       .where("status", "==", "active")
//       .get();

//     if (snapshot.empty) return res.json([]);

//     let trips = [];
//     snapshot.forEach((doc) => trips.push({ tripId: doc.id, ...doc.data() }));

//     return res.json(trips);
//   } catch (error) {
//     console.error("🔥 Error in /hospital/trips/active:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// });

// // 🚑 Get **all trips** (active + completed) for a hospital
// router.get("/trips/all/:hospitalId", async (req, res) => {
//   try {
//     const { hospitalId } = req.params;

//     const snapshot = await db
//       .collection("trips")
//       .where("hospitalId", "==", hospitalId)
//       .get();

//     if (snapshot.empty) return res.json([]);

//     let trips = [];
//     snapshot.forEach((doc) => trips.push({ tripId: doc.id, ...doc.data() }));

//     return res.json(trips);
//   } catch (error) {
//     console.error("🔥 Error in /hospital/trips/all:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// });

// router.get("/all", async (req, res) => {
//   try {
//     const snapshot = await db.collection("hospitals").get();
//     if (snapshot.empty) return res.json([]);

//     const hospitals = [];
//     snapshot.forEach((doc) => {
//       const data = doc.data();

//       // Convert GeoPoint fields to plain objects
//       if (data.location && data.location._latitude !== undefined && data.location._longitude !== undefined) {
//         data.location = {
//           lat: data.location._latitude,
//           lng: data.location._longitude
//         };
//       }

//       hospitals.push({ id: doc.id, ...data });
//     });

//     return res.json(hospitals);
//   } catch (error) {
//     console.error("🔥 Error in /hospital/all:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// });


// module.exports = router;











const express = require("express");
const router = express.Router();
const db = require("../config/firestore");

// 🏥 Hospital login
router.post("/login", async (req, res) => {
  try {
    const { hospitalId } = req.body;
    if (!hospitalId) return res.status(400).json({ error: "Hospital ID required" });

    const snapshot = await db.collection("hospitals").where("hospitalId", "==", hospitalId).get();
    if (snapshot.empty) return res.status(401).json({ error: "Invalid hospital ID" });

    let hospitalData;
    snapshot.forEach(doc => hospitalData = { id: doc.id, ...doc.data() });

    return res.json({ message: "Login successful", hospital: hospitalData });
  } catch (error) {
    console.error("🔥 Error in /hospital/login:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// 🚑 Get active trips for a hospital
router.get("/trips/active/:hospitalId", async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const snapshot = await db.collection("trips")
      .where("hospitalId", "==", hospitalId)
      .where("status", "==", "active")
      .get();

    if (snapshot.empty) return res.json([]);
    const trips = [];
    snapshot.forEach(doc => trips.push({ tripId: doc.id, ...doc.data() }));
    return res.json(trips);
  } catch (error) {
    console.error("🔥 Error in /hospital/trips/active:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// 🚑 Get all trips (active + completed) for a hospital
router.get("/trips/all/:hospitalId", async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const snapshot = await db.collection("trips")
      .where("hospitalId", "==", hospitalId)
      .get();

    if (snapshot.empty) return res.json([]);
    const trips = [];
    snapshot.forEach(doc => trips.push({ tripId: doc.id, ...doc.data() }));
    return res.json(trips);
  } catch (error) {
    console.error("🔥 Error in /hospital/trips/all:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// 🏥 Get all hospitals
router.get("/all", async (req, res) => {
  try {
    const snapshot = await db.collection("hospitals").get();
    if (snapshot.empty) return res.json([]);

    const hospitals = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.location?._latitude !== undefined && data.location?._longitude !== undefined) {
        data.location = { lat: data.location._latitude, lng: data.location._longitude };
      }
      hospitals.push({ id: doc.id, ...data });
    });

    return res.json(hospitals);
  } catch (error) {
    console.error("🔥 Error in /hospital/all:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
