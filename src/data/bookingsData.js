// Firestore seed data for the bookings collection.
// This file stores sample shared resource booking requests.

const bookingsData = [
  {
    id: "booking-community-hall-pending-2026-07-15",

    resourceId: "resource-community-hall",
    resourceName: "Community Hall",

    residentId: "sample-resident-a12",
    residentName: "Sarah Johnson",
    residentEmail: "sarah.johnson@example.com",
    apartment: "A12",

    bookingDate: "2026-07-15T00:00:00.000Z",
    startTime: "18:00",
    endTime: "20:00",

    purpose: "Residents association meeting",
    attendees: 12,

    status: "pending",

    requestNote:
      "Resident requested the community hall for a small evening meeting with other residents.",

    reviewedAt: null,
    reviewedBy: null,
    decisionNote: "",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
  {
    id: "booking-guest-parking-approved-2026-07-16",

    resourceId: "resource-guest-parking",
    resourceName: "Guest Parking Space",

    residentId: "sample-resident-b08",
    residentName: "James Wilson",
    residentEmail: "james.wilson@example.com",
    apartment: "B08",

    bookingDate: "2026-07-16T00:00:00.000Z",
    startTime: "10:00",
    endTime: "18:00",

    purpose: "Visitor parking for family guest",
    attendees: 1,

    status: "approved",

    requestNote:
      "Resident requested guest parking for a family visitor during the day.",

    reviewedAt: "2026-07-07T00:00:00.000Z",
    reviewedBy: "savQNi7sDffhlV6sD1XZdehohfK2",
    decisionNote: "Approved for the requested time period.",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
];

module.exports = {
  bookingsData,
};
