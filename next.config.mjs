/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["gtdemacbook-pro.local"],
  reactCompiler: false,
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
