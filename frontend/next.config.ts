import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8787";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/i/:id",
        destination: `${apiUrl}/i/:id`,
      },
    ];
  },
};

export default nextConfig;
