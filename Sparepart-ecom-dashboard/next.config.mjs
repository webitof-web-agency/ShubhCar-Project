import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  sassOptions: {
    includePaths: [
      path.join(__dirname, 'node_modules').replace(/\\/g, '/'),
      path.join(__dirname, 'node_modules/bootstrap/scss').replace(/\\/g, '/'),
    ],
  },
};

export default nextConfig;
