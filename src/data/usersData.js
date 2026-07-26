// Firestore seed data for the users collection.
// This file stores the starting Building Manager profile used by the application.

const usersData = [
  {
    id: "savQNi7sDffhlV6sD1XZdehohfK2",
    uid: "savQNi7sDffhlV6sD1XZdehohfK2",

    firstName: "Community",
    lastName: "Manager",
    email: "office@eliresidential.co.uk",
    phone: "",

    building: "Eli Residential Community",
    apartment: "",

    role: "building-manager",
    status: "approved",

    isActive: true,

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",

    approvedAt: null,
    approvedBy: null,

    rejectedAt: null,
    rejectedBy: null,
  },
];

module.exports = {
  usersData,
};
