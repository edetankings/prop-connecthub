# PROP-CONNECT

PROP-CONNECT is a real-estate platform for finding and verifying properties in
Nigeria. The frontend is built with React, TypeScript, Vite, and Tailwind CSS.

## Development

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

The dev and build lifecycle scripts generate `public/sitemap.xml` with Node.js.
No additional JavaScript runtime is required.

## Validation and production build

```sh
npm test
npm run lint
npm run build
```

## Backend configuration

The app continues to use its existing Supabase project for authentication,
database, storage, and Edge Functions. Configure the existing
`VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, and
`VITE_SUPABASE_PUBLISHABLE_KEY` variables in the local environment. Do not put
service-role keys or other secrets in frontend environment variables.
