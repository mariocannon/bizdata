/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
    // Keep Prisma out of the bundler so its native query engine is traced into
    // the serverless function as a real file rather than being inlined.
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client'],
    // Belt and braces: make sure the engine binary ships with every route that
    // talks to the database. This key only takes effect under `experimental` on
    // Next 14 — at the top level the build warns and ignores it.
    outputFileTracingIncludes: {
      '/**': ['./node_modules/.prisma/client/**'],
    },
  },
}

module.exports = nextConfig
