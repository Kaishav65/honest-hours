import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Honest Hours",
    short_name: "Honest Hours",
    description: "An honest coach for where your hours go.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#f5f1e8",
    theme_color: "#566e46",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
