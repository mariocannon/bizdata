/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app is behind a password and never framed or embedded, so there is
  // nothing to gain from advertising the stack on every response.
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
    // Keep Prisma out of the bundler so its native query engine is traced into
    // the serverless function as a real file rather than being inlined.
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client'],
    // Belt and braces: make sure the engine binary ships with every route that
    // talks to the database.
    //
    // This lived at the top level until now, where Next 14 doesn't read it —
    // the build warned "Unrecognized key(s) in object: 'outputFileTracingIncludes'"
    // and traced without it. It moves to the top level in Next 15.
    outputFileTracingIncludes: {
      '/**': ['./node_modules/.prisma/client/**'],
    },
  },
}

module.exports = nextConfig
