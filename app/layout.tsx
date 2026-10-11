import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Certificate of Participant | Shree R.M.D. Ayurved College & Hospital",
  description:
    "Official Certificate Portal for the 11th National Ayurveda Day Celebration at Shree R.M.D. Ayurved College & Hospital, Waghaldhara, Gujarat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#fbf8f2] text-[#1b4332] selection:bg-[#c28b26]/20 selection:text-[#132a13]">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
