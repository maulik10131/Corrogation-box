import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: 'http://localhost/corrugation-pms/backend/web/:path*',
      },
    ];
  },
};

export default nextConfig;
