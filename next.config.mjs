/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/:userId/refresh', destination: '/api/refresh/:userId' },
      { source: '/:userId/refresh/:appIndex', destination: '/api/refresh/:userId/:appIndex' },
    ];
  },
};

export default nextConfig;
