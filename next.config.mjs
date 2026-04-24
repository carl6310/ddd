/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: false,
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
