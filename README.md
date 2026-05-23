# Image Host Edge ⚡️

A lightning-fast, highly scalable, and completely serverless Image Hosting platform built on Cloudflare Workers, Next.js, and Vercel.

## Architecture
- **Frontend**: Next.js 16 (App Router) hosted on Cloudflare.
- **Backend API**: Cloudflare Workers (Hono)
- **Database**: Cloudflare D1 (Serverless SQLite)
- **Storage**: Cloudflare R2 (S3-compatible Object Storage)
- **Authentication**: Clerk

## Features
- Drag & Drop Image Uploads
- Instant Cloudinary optimizations & transformations
- Ephemeral "Burn-after-reading" images (cron-based auto deletion)
- Developer API Keys & Programmatic Uploads
- Admin Dashboard for Moderation

## Documentation
Check out the [Developer API Documentation](./API_DOCS.md) to learn how to integrate the image host into your own CLI tools or external applications using your API Keys!