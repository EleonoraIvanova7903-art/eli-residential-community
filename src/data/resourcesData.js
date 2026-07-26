// Firestore seed data for the resources collection.
// This file stores the shared community resources that can be managed and booked.

const resourcesData = [
  {
    id: "resource-community-hall",

    resourceName: "Community Hall",
    category: "Indoor Space",
    location: "Ground Floor",
    capacity: 40,

    description:
      "Shared indoor hall suitable for resident meetings, small events and community activities.",

    status: "available",
    bookingRequired: true,

    imagePath: "/images/03-community-hall.png",

    rules:
      "Residents must leave the hall clean after use. Bookings must be approved by the Building Manager.",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
  {
    id: "resource-guest-parking",

    resourceName: "Guest Parking Space",
    category: "Parking",
    location: "Outdoor Parking Area",
    capacity: 1,

    description:
      "Shared guest parking space for visitors of approved residents.",

    status: "available",
    bookingRequired: true,

    imagePath: "/images/04-guest-parking-space.png",

    rules:
      "Guest parking must be booked in advance and used only during the approved time period.",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
  {
    id: "resource-tool-kit",

    resourceName: "Tool Kit",
    category: "Shared Tools",
    location: "Building Manager Office",
    capacity: 1,

    description:
      "Shared tool kit available for small household and community maintenance tasks.",

    status: "available",
    bookingRequired: true,

    imagePath: "/images/05-tool-kit.png",

    rules:
      "Tools must be returned in good condition. Any damage must be reported to the Building Manager.",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
  {
    id: "resource-barbecue-area",

    resourceName: "Barbecue Area",
    category: "Outdoor Space",
    location: "Shared Garden Area",
    capacity: 12,

    description:
      "Outdoor barbecue area for approved resident gatherings and small community activities.",

    status: "available",
    bookingRequired: true,

    imagePath: "/images/06-barbecue-area.png",

    rules:
      "The barbecue area must be cleaned after use. Residents must follow safety rules during use.",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
  {
    id: "resource-childrens-play-area",

    resourceName: "Children's Play Area",
    category: "Family Area",
    location: "Shared Outdoor Area",
    capacity: 15,

    description:
      "Shared play area for children living in the residential community.",

    status: "available",
    bookingRequired: false,

    imagePath: "/images/07-childrens-play-area.png",

    rules:
      "Children must be supervised by a parent, guardian or responsible adult while using the play area.",

    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
];

module.exports = {
  resourcesData,
};
