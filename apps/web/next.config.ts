import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/config/i18n.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default withNextIntl(nextConfig);