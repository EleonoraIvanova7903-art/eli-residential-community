// Firestore seed data for the events collection.
// This file stores sample community events managed by the Building Manager.

const eventsData = [
  {
    id: "event-summer-community-meeting-2026-07-25",

    eventTitle: "Summer Community Meeting",
    category: "Community Meeting",
    status: "scheduled",

    location: "Community Hall",

    eventDate: "2026-07-25T00:00:00.000Z",
    startTime: "18:30",
    endTime: "20:00",

    capacity: 40,

    description:
      "A community meeting for residents to discuss shared facilities, upcoming maintenance work and general residential matters.",

    organiserName: "Community Manager",
    organiserId: "savQNi7sDffhlV6sD1XZdehohfK2",

    notes:
      "Residents are encouraged to attend and raise any community-related questions.",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
  {
    id: "event-garden-clean-up-2026-07-28",

    eventTitle: "Shared Garden Clean-up",
    category: "Community Activity",
    status: "scheduled",

    location: "Shared Garden Area",

    eventDate: "2026-07-28T00:00:00.000Z",
    startTime: "10:00",
    endTime: "12:00",

    capacity: 20,

    description:
      "A voluntary resident activity to help tidy the shared garden area and improve the outdoor community space.",

    organiserName: "Community Manager",
    organiserId: "savQNi7sDffhlV6sD1XZdehohfK2",

    notes:
      "Residents may bring gloves and suitable outdoor clothing. Basic tools will be available from the shared tool kit.",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
];

module.exports = {
  eventsData,
};
