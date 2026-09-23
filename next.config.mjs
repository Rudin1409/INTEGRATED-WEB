/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Rewrites /api/proses_ai to Python serverless function if deployed or running via FastAPI
  async rewrites() {
    return [
      {
        source: '/api/proses_ai',
        destination: process.env.PYTHON_API_URL || '/api/proses_ai.py',
      },
    ];
  },
};

export default nextConfig;
