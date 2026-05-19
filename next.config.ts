/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow leaflet CSS to load correctly
  transpilePackages: ['leaflet', 'react-leaflet'],
};

export default nextConfig;
