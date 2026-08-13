const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK using service account if present or default credentials
if (admin.apps.length === 0) {
  try {
    const serviceAccount = require('../backend/dpgnotes-firebase-adminsdk.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    admin.initializeApp({
      projectId: 'dpgnotes'
    });
  }
}

const db = admin.firestore();

async function runTrackIdMigration() {
  console.log("Starting Firestore TrackId Migration for all documents...");
  try {
    const docsSnap = await db.collection("documents").get();
    console.log(`Found ${docsSnap.size} total documents in Firestore documents collection.`);

    const existingTrackIds = new Set();
    docsSnap.forEach(dSnap => {
      const d = dSnap.data();
      if (d.trackId) existingTrackIds.add(String(d.trackId));
    });

    let assignedCount = 0;
    let existingCount = 0;

    for (const dSnap of docsSnap.docs) {
      const d = dSnap.data();
      if (!d.trackId) {
        let newTrackId = "";
        do {
          newTrackId = Math.floor(10000000 + Math.random() * 90000000).toString();
        } while (existingTrackIds.has(newTrackId));

        existingTrackIds.add(newTrackId);
        await dSnap.ref.update({ trackId: newTrackId });
        console.log(`✅ Assigned trackId ${newTrackId} to doc "${d.title || dSnap.id}" (${dSnap.id})`);
        assignedCount++;
      } else {
        existingCount++;
      }
    }

    console.log(`🎉 TrackId Migration Complete! Assigned trackId to ${assignedCount} documents. ${existingCount} documents already had trackIds.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

runTrackIdMigration();
