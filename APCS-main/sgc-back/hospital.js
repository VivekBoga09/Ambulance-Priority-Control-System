// --- WARNING: This code must run in a secure Node.js backend environment (server) ---
// It uses the Firebase Admin SDK to bypass security rules and directly write data.

// Assume you have initialized the Firebase Admin SDK in your main file (e.g., firebase-admin.js)
// For this example, we'll mock the import based on your previous code structure:
// const db = require('./config/firestore'); 
// Assuming `db` is your Firestore instance from the Admin SDK.
const admin = require('firebase-admin');

// --- Replace this with your actual Firebase Admin SDK initialization ---
// If you are running this as a standalone script:
// const serviceAccount = require('./path/to/your/serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });
// const db = admin.firestore();
// --- END Firebase Admin SDK Setup ---


// Assuming 'db' is available from your server environment or the Admin SDK setup above
const db = require('./config/firestore'); // Adjust path as needed

// --------------------------------------------------------------------------------

const hospitalsData = [
  { "hospitalId": "H001", "location": [17.4411, 78.4711], "name": "Apollo Hospital Secunderabad", "status": "active" },
  { "hospitalId": "H002", "location": [17.4375, 78.4487], "name": "Yashoda Hospitals Secunderabad", "status": "active" },
  { "hospitalId": "H003", "location": [17.4165, 78.4382], "name": "Apollo Hospitals Jubilee Hills", "status": "active" },
  { "hospitalId": "H004", "location": [17.4093, 78.3756], "name": "Continental Hospitals Gachibowli", "status": "active" },
  { "hospitalId": "H005", "location": [17.3720, 78.4740], "name": "Osmania General Hospital (OGH)", "status": "active" },
  { "hospitalId": "H006", "location": [17.4468, 78.4682], "name": "KIMS Hospitals Secunderabad", "status": "active" },
  { "hospitalId": "H007", "location": [17.4243, 78.4552], "name": "Care Hospitals Banjara Hills", "status": "active" },
  { "hospitalId": "H008", "location": [17.4357, 78.4633], "name": "MaxCure Hospitals Hitech City", "status": "active" },
  { "hospitalId": "H009", "location": [17.4110, 78.5080], "name": "Kamineni Hospitals L.B. Nagar", "status": "active" },
  { "hospitalId": "H010", "location": [17.4940, 78.3970], "name": "Prathima Hospitals Kukatpally", "status": "active" },
  { "hospitalId": "H011", "location": [17.4390, 78.3840], "name": "Medicover Hospitals Hitech City", "status": "active" },
  { "hospitalId": "H012", "location": [17.4119, 78.4529], "name": "NIMS Hospital Punjagutta", "status": "active" },
  { "hospitalId": "H013", "location": [17.4600, 78.5300], "name": "Apollo Hospitals ECIL",
    "status": "active"
  },
  { "hospitalId": "H014", "location": [17.4040, 78.4900], "name": "Yashoda Hospitals Malakpet", "status": "active" },
  { "hospitalId": "H015", "location": [17.4060, 78.4520], "name": "Gleneagles Global Hospitals Lakdikapul", "status": "active" },
  { "hospitalId": "H016", "location": [17.4420, 78.4510], "name": "Aster Prime Hospital Ameerpet", "status": "active" },
  { "hospitalId": "H017", "location": [17.3820, 78.4410], "name": "Virinchi Hospitals Banjara Hills", "status": "active" },
  { "hospitalId": "H018", "location": [17.3990, 78.4840], "name": "Government ENT Hospital Koti", "status": "active" },
  { "hospitalId": "H019", "location": [17.4560, 78.4720], "name": "Gandhi Hospital Musheerabad", "status": "active" },
  { "hospitalId": "H020", "location": [17.4730, 78.4520], "name": "Rainbow Children's Hospital Secunderabad", "status": "active" }
];


// Function to convert the [lat, lon] array into a Firestore GeoPoint object
// This ensures Firestore treats the location as a proper map coordinate
function createGeoPoint(locationArray) {
    if (!admin.firestore.GeoPoint) {
        // Fallback for non-Admin SDK environments, though highly discouraged for writes
        console.warn("GeoPoint class not available. Storing as raw object.");
        return { latitude: locationArray[0], longitude: locationArray[1] };
    }
    return new admin.firestore.GeoPoint(locationArray[0], locationArray[1]);
}

/**
 * Uploads the hospital data to the 'hospitals' collection using a batch write.
 */
async function uploadHospitalsBatch() {
    if (typeof db === 'undefined') {
        console.error("Firestore database object 'db' is not defined. Ensure Admin SDK is initialized.");
        return;
    }

    const batch = db.batch();
    const hospitalsCollection = db.collection('hospitals');

    console.log(`Preparing to upload ${hospitalsData.length} documents...`);
    
    hospitalsData.forEach((hospital) => {
        // Prepare data for Firestore
        const hospitalData = {
            ...hospital,
            // Convert the array to a Firestore GeoPoint for proper map indexing/queries
            location: createGeoPoint(hospital.location), 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Use hospitalId as the document ID for easy lookup
        const docRef = hospitalsCollection.doc(hospital.hospitalId);
        
        // Set the document in the batch
        batch.set(docRef, hospitalData);
    });

    try {
        await batch.commit();
        console.log(`✅ Successfully uploaded ${hospitalsData.length} hospitals to Firestore!`);
    } catch (error) {
        console.error("❌ Batch commit failed:", error);
    }
}

// Execute the function
// Note: If running this within an Express route, you would call this inside a route handler.
// For a standalone script, run it directly:
// uploadHospitalsBatch(); 

// Uncomment the line below to run the script if it's a standalone file
// uploadHospitalsBatch();