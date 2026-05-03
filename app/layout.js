import "./globals.css";

export const metadata = {
  title: "DDU Aggregations",
  description: "State of the Art Workshop",
  icons: {
    icon: "/DDU Logo.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
