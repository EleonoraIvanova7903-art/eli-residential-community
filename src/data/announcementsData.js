// Firestore seed data for the announcements collection.
// This file stores sample community announcements for approved residents.

const announcementsData = [
  {
    id: "announcement-water-maintenance-2026-07-20",

    title: "Scheduled Water Maintenance",
    category: "Maintenance",
    priority: "high",
    status: "published",

    message:
      "Water maintenance work is scheduled for Saturday morning. Residents may experience a temporary interruption between 09:00 and 11:00.",

    targetType: "all",
    recipientId: "",
    recipientName: "All residents",

    createdBy: "savQNi7sDffhlV6sD1XZdehohfK2",
    createdByName: "Community Manager",

    publishedAt: "2026-07-07T00:00:00.000Z",
    expiresAt: "2026-07-21T23:59:00.000Z",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
  {
    id: "announcement-parking-reminder-2026-07-22",

    title: "Guest Parking Reminder",
    category: "Parking",
    priority: "medium",
    status: "published",

    message:
      "Residents are reminded that guest parking spaces must be booked in advance through the residential community system.",

    targetType: "all",
    recipientId: "",
    recipientName: "All residents",

    createdBy: "savQNi7sDffhlV6sD1XZdehohfK2",
    createdByName: "Community Manager",

    publishedAt: "2026-07-07T00:00:00.000Z",
    expiresAt: "2026-07-22T23:59:00.000Z",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
];

module.exports = {
  announcementsData,
};
