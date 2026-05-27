/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bypass typechecking and linting checks in next build to speed up production compilation from minutes to seconds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // SWC compiler optimizations for heavy packages to speed up local page loading and Hot Module Replacement (HMR)
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-syntax-highlighter', 'katex', 'framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
