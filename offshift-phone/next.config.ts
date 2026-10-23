import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The research console and the watch preview were removed: old links and bookmarks open the week.
  async redirects() {
    return [
      { source: "/team", destination: "/calendar", permanent: false },
      { source: "/watch", destination: "/calendar", permanent: false },
    ];
  },
};

export default nextConfig;
