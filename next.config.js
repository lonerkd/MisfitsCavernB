/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;
