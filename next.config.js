
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    outputFileTracingExcludes: {
      "**/*": [
        "node_modules/@swc/core-linux-x64-gnu",
        "node_modules/@swc/core-linux-x64-musl",
        "node_modules/esbuild-android-64",
        "node_modules/esbuild-android-arm64",
        "node_modules/esbuild-darwin-64",
        "node_modules/esbuild-darwin-arm64",
        "node_modules/esbuild-freebsd-64",
        "node_modules/esbuild-freebsd-arm64",
        "node_modules/esbuild-linux-32",
        "node_modules/esbuild-linux-64",
        "node_modules/esbuild-linux-arm",
        "node_modules/esbuild-linux-arm64",
        "node_modules/esbuild-linux-mips64le",
        "node_modules/esbuild-linux-ppc64le",
        "node_modules/esbuild-linux-riscv64",
        "node_modules/esbuild-linux-s390x",
        "node_modules/esbuild-netbsd-64",
        "node_modules/esbuild-openbsd-64",
        "node_modules/esbuild-sunos-64",
        "node_modules/esbuild-windows-32",
        "node_modules/esbuild-windows-64",
        "node_modules/esbuild-windows-arm64",
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ],
  },
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    return config;
  },
};

module.exports = nextConfig;

    
