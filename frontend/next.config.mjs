/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendHost =
      process.env.INTERNAL_BACKEND_URL || "http://backend:8000";
    return [
      {
        source: "/session/:path*",
        destination: `${backendHost}/session/:path*`,
      },
      {
        source: "/payment/:path*",
        destination: `${backendHost}/payment/:path*`,
      },
      {
        source: "/camera/:path*",
        destination: `${backendHost}/camera/:path*`,
      },
      {
        source: "/printer/:path*",
        destination: `${backendHost}/printer/:path*`,
      },
      {
        source: "/image/:path*",
        destination: `${backendHost}/image/:path*`,
      },
      {
        source: "/health",
        destination: `${backendHost}/health`,
      },
      {
        source: "/templates",
        destination: `${backendHost}/templates`,
      },
      {
        source: "/storage/:path*",
        destination: `${backendHost}/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;
