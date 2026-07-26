# Eli Residential Community

## Project Overview

Eli Residential Community is a web-based residential community
management system developed as a university dissertation artefact.

The application provides separate role-based areas for a Building
Manager and approved residents. It supports resident registration,
community announcements, events, shared-resource bookings, issue
reporting, notifications and data analysis.

Firebase Authentication is used for account access, while Cloud
Firestore is used to store and update the application data.

## Test Login Accounts

The following accounts can be used to access and test the application.

### Building Manager

Email: manager@eliresidential.co.uk

Password: 123456

This account provides access to the Building Manager area.

### Resident — James Carter

Email: james.carter@eliresidential.co.uk

Password: 123456

This is an approved resident account and provides access to the
Resident area.

### Resident — Sophia Bennett

Email: sophia.bennett@eliresidential.co.uk

Password: 123456

This is a second approved resident account and can be used to test
resident-specific functionality.

The login page is available at:

http://localhost:3000/login

## Main Functionality

### Building Manager

The Building Manager can:

- review, approve or reject resident registrations;
- view and manage approved residents;
- create and manage community announcements;
- create and manage community events;
- manage shared community resources;
- review, approve or reject booking requests;
- review issue reports submitted by residents;
- update issue report statuses;
- view dashboard statistics and data analysis;
- receive notifications about resident activity.

### Resident

An approved resident can:

- access a personal dashboard;
- view community announcements;
- view upcoming community events;
- browse available shared resources;
- submit and track booking requests;
- submit and track issue reports;
- receive notifications;
- update permitted personal profile information.

## Technologies

The project uses:

- Next.js 16.2.10
- React
- JavaScript
- Firebase Authentication
- Cloud Firestore
- Recharts
- React Icons
- Standard CSS

The project does not use TypeScript or Bootstrap.

## Installation Requirements

Before starting the application, install:

- Node.js version 20.9 or later
- npm
- A modern web browser

The installed versions can be checked with:

    node --version
    npm --version

## Project Installation

The `node_modules` and `.next` folders are not included when the
project is shared because they are generated automatically.

Open a terminal in the main project folder containing `package.json`.

Install the required project dependencies:

    npm install

This command recreates the `node_modules` folder and installs all
packages required by the project.

The `.next` folder is created automatically when the application is
started or built.

## Firebase Configuration

The `.env.local` file must remain in the main project folder.

It contains the Firebase configuration required by Firebase
Authentication and Cloud Firestore.

The application uses the following environment variables:

    NEXT_PUBLIC_FIREBASE_API_KEY=
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
    NEXT_PUBLIC_FIREBASE_APP_ID=

The application will not connect to Firebase correctly when this file
is missing or contains incorrect values.

## Starting the Application

Start the development server with:

    npm run dev

Then open the application in a browser:

http://localhost:3000

## Application Areas

### Public Area

- Home
- About
- Login
- Register

### Building Manager Area

- Dashboard
- Registrations
- Residents
- Announcements
- Events
- Resources
- Bookings
- Issue Reports
- Data Analysis
- Quick Actions

### Resident Area

- Dashboard
- Announcements
- Events
- Resources
- My Bookings
- Issue Reports
- My Profile

## Firestore Collections

The application uses the following Cloud Firestore collections:

- `users`
- `announcements`
- `events`
- `resources`
- `bookings`
- `issueReports`

The Building Manager and Resident areas use the same collections, but
the available actions depend on the authenticated user role.

## Testing the Main Workflows

### Booking Workflow

1. Log in with one of the Resident accounts.
2. Open My Bookings.
3. Submit a booking request.
4. Log out and sign in with the Building Manager account.
5. Open Bookings.
6. Approve or reject the booking request.
7. Sign in again with the Resident account.
8. Check the updated booking status and notification.

### Issue Report Workflow

1. Log in with one of the Resident accounts.
2. Open Issue Reports.
3. Submit a new issue report.
4. Log out and sign in with the Building Manager account.
5. Open Issue Reports.
6. Update the report status.
7. Sign in again with the Resident account.
8. Check the updated issue status and notification.

### Registration Workflow

1. Open the Register page.
2. Create a new resident account.
3. Log in with the Building Manager account.
4. Open Registrations.
5. Approve or reject the new account.
6. An approved and active resident can access the Resident area.

## Production Build

To verify that the project compiles successfully, run:

    npm run build

The `.next` folder is created automatically during the build.

After a successful build, start the production version with:

    npm run start

Then open:

http://localhost:3000

## Important Notes

- Run `npm install` after downloading or copying the project.
- Do not manually create the `node_modules` folder.
- Do not manually create the `.next` folder.
- Keep the `.env.local` file in the main project folder.
- Resident accounts must be approved and active.
- The Forgot Password function is outside the current project scope.
- The application is written entirely in JavaScript.
- The project has been successfully tested with `npm run build`.
