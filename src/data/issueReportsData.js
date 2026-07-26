// Firestore seed data for the issueReports collection.
// This file stores sample resident issue reports for the Building Manager area.

const issueReportsData = [
  {
    id: "issue-leaking-pipe-open-2026-07-17",

    reportTitle: "Leaking pipe in communal hallway",
    category: "Maintenance",
    priority: "high",
    status: "open",

    residentId: "sample-resident-c14",
    residentName: "Emma Thompson",
    residentEmail: "emma.thompson@example.com",
    apartment: "C14",

    location: "Second floor communal hallway",

    description:
      "A pipe appears to be leaking near the second floor communal hallway. The floor is becoming wet and may become a safety risk.",

    managerNote: "",
    assignedTo: "",
    reportedAt: "2026-07-17T09:30:00.000Z",
    resolvedAt: null,

    createdAt: "2026-07-17T09:30:00.000Z",
    updatedAt: "2026-07-17T09:30:00.000Z",
  },
  {
    id: "issue-broken-light-in-progress-2026-07-18",

    reportTitle: "Broken light near main entrance",
    category: "Lighting",
    priority: "medium",
    status: "in-progress",

    residentId: "sample-resident-d09",
    residentName: "Oliver Harris",
    residentEmail: "oliver.harris@example.com",
    apartment: "D09",

    location: "Main entrance",

    description:
      "The light near the main entrance is not working. The area is poorly lit during the evening.",

    managerNote:
      "Electrician has been contacted and the repair is being arranged.",
    assignedTo: "Building Maintenance Team",
    reportedAt: "2026-07-18T16:15:00.000Z",
    resolvedAt: null,

    createdAt: "2026-07-18T16:15:00.000Z",
    updatedAt: "2026-07-18T17:00:00.000Z",
  },
];

module.exports = {
  issueReportsData,
};
