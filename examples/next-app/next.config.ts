import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@support-widget/ai-helper'],
  agentRules: false,
};

export default nextConfig;
