/** @type {import('next').NextConfig} */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https: http:;
  media-src 'self' https://d8j0ntlcm91z4.cloudfront.net https:;
  font-src 'self' https://fonts.gstatic.com data:;
  connect-src 'self' https://api.kwickbot.in http://localhost:5001 http://127.0.0.1:5001 wss://api.kwickbot.in ws://localhost:5001 ws://127.0.0.1:5001;
  frame-src 'self';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'kwickbot.in' },
      { protocol: 'https', hostname: 'www.kwickbot.in' },
      { protocol: 'http', hostname: 'localhost' }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          }
        ]
      }
    ];
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
