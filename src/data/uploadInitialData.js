// Uploads initial Firestore data to Firestore.
// Each collection has its own data file and can be uploaded separately from the terminal.

const fs = require("fs");
const path = require("path");

const { usersData } = require("./usersData");
const { resourcesData } = require("./resourcesData");
const { bookingsData } = require("./bookingsData");
const { issueReportsData } = require("./issueReportsData");
const { announcementsData } = require("./announcementsData");
const { eventsData } = require("./eventsData");

const firestoreSeedData = {
  users: usersData,
  resources: resourcesData,
  bookings: bookingsData,
  issueReports: issueReportsData,
  announcements: announcementsData,
  events: eventsData,
};

const dateFieldNames = new Set([
  "createdAt",
  "updatedAt",
  "approvedAt",
  "rejectedAt",
  "bookingDate",
  "reviewedAt",
  "reportedAt",
  "resolvedAt",
  "publishedAt",
  "expiresAt",
  "eventDate",
]);

function loadLocalEnvironmentVariables() {
  const environmentFilePath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(environmentFilePath)) {
    throw new Error("The .env.local file was not found in the project root.");
  }

  const environmentFileContent = fs.readFileSync(environmentFilePath, "utf8");
  const environmentLines = environmentFileContent.split(/\r?\n/);

  environmentLines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function getFirebaseConfig() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    firebaseConfig.measurementId =
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  }

  return firebaseConfig;
}

function validateFirebaseConfig(firebaseConfig) {
  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      "Missing Firebase environment values: " + missingKeys.join(", "),
    );
  }
}

function convertDateFields(documentData) {
  const convertedData = {};

  Object.entries(documentData).forEach(([key, value]) => {
    if (dateFieldNames.has(key) && typeof value === "string") {
      convertedData[key] = new Date(value);
      return;
    }

    convertedData[key] = value;
  });

  return convertedData;
}

function getSeedCollectionsToUpload() {
  const targetCollectionName = process.argv[2] ? process.argv[2].trim() : "";

  if (!targetCollectionName) {
    return firestoreSeedData;
  }

  if (!firestoreSeedData[targetCollectionName]) {
    throw new Error(
      "The collection '" +
        targetCollectionName +
        "' was not found in firestoreSeedData.",
    );
  }

  return {
    [targetCollectionName]: firestoreSeedData[targetCollectionName],
  };
}

async function uploadInitialData() {
  loadLocalEnvironmentVariables();

  const firebaseConfig = getFirebaseConfig();

  validateFirebaseConfig(firebaseConfig);

  const { initializeApp, getApps } = await import("firebase/app");
  const { doc, getFirestore, writeBatch } = await import("firebase/firestore");

  const firebaseApp =
    getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

  const database = getFirestore(firebaseApp);
  const batch = writeBatch(database);
  const seedCollectionsToUpload = getSeedCollectionsToUpload();

  let totalDocuments = 0;

  Object.entries(seedCollectionsToUpload).forEach(
    ([collectionName, documents]) => {
      documents.forEach((seedDocument) => {
        const { id, ...documentData } = seedDocument;

        const documentReference = doc(database, collectionName, id);
        const preparedDocumentData = convertDateFields(documentData);

        batch.set(documentReference, preparedDocumentData, { merge: true });

        totalDocuments += 1;
      });
    },
  );

  await batch.commit();

  console.log("Firestore upload completed successfully.");
  console.log("Created or updated documents: " + totalDocuments);
  console.log(
    "Collections updated: " + Object.keys(seedCollectionsToUpload).join(", "),
  );
}

uploadInitialData().catch((error) => {
  console.error("Firestore upload failed.");
  console.error(error.message);
  process.exit(1);
});
