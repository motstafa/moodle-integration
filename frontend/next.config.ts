import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow profile images served by any Moodle instance.
    // In production, replace the wildcard with your exact Moodle hostname.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/pluginfile.php/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/pluginfile.php/**',
      },
    ],
  },
};

export default nextConfig;
