/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
