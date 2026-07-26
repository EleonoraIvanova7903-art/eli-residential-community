import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export async function createResidentUserProfile(user, formData) {
  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    uid: user.uid,
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    building: formData.building,
    apartment: formData.apartment,
    role: "resident",
    status: "pending",
    isActive: true,
    createdAt: serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
  });
}

export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return {
    id: userSnap.id,
    ...userSnap.data(),
  };
}

export async function getAllUsers() {
  const usersSnapshot = await getDocs(collection(db, "users"));

  return usersSnapshot.docs.map((userDoc) => ({
    id: userDoc.id,
    ...userDoc.data(),
  }));
}

export async function getPendingResidents() {
  const users = await getAllUsers();

  return users.filter(
    (user) => user.role === "resident" && user.status === "pending",
  );
}

export async function getApprovedResidents() {
  const users = await getAllUsers();

  return users.filter(
    (user) => user.role === "resident" && user.status === "approved",
  );
}

export async function approveResident(residentId, managerUid) {
  const residentRef = doc(db, "users", residentId);

  await updateDoc(residentRef, {
    status: "approved",
    approvedAt: serverTimestamp(),
    approvedBy: managerUid,
    rejectedAt: null,
    rejectedBy: null,
  });
}

export async function rejectResident(residentId, managerUid) {
  const residentRef = doc(db, "users", residentId);

  await updateDoc(residentRef, {
    status: "rejected",
    rejectedAt: serverTimestamp(),
    rejectedBy: managerUid,
  });
}
