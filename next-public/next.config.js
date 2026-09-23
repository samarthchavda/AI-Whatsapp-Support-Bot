/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'kwickbot.in' },
      { protocol: 'https', hostname: 'www.kwickbot.in' },
      { protocol: 'http', hostname: 'localhost' }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/api/:path*'
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5001/uploads/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
