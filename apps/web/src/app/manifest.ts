import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BukuHR",
    short_name: "BukuHR",
    description: "BukuHR employee app",
    display: "standalone",
    start_url: "/employee/dashboard",
    scope: "/",
    background_color: "#f5f3ee",
    theme_color: "#2d5e3a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
