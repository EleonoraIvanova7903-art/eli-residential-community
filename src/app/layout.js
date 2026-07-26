import "./globals.css";

export const metadata = {
  title: "Residential Community App",
  description:
    "A web application for managing communication, issues, bookings and events in a residential community.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
