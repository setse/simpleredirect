import "./globals.css";

export const metadata = {
  title: "SimpleRedirect — Dynamic QR Code Manager",
  description:
    "Manage 20 dynamic QR codes whose destinations can be changed at any time without regenerating the codes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
