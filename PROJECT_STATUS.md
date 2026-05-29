# Project Status

## Completed

- Initialized the backend repository and pushed it to GitHub.
- Set up a Fastify-based Node.js API.
- Added environment configuration with `.env.example`.
- Added a health endpoint.
- Added dual database support with SQLite for local development and PostgreSQL for production.
- Added cookie-backed session auth for admin access.
- Added database-backed track and release endpoints.
- Added admin CRUD routes for tracks and releases.
- Added media asset upload, storage, and local static serving for uploaded files.
- Added signed playback URL generation for track streaming.

## Current Backend Shape

- Runtime: Node.js
- Framework: Fastify
- Validation: Zod
- Auth foundation: cookie sessions in use, JWT plugin installed but not yet core path
- Main feature in progress: tighter music streaming delivery and media handling

## Product Model Direction

- Public music experience for listeners
- Private admin experience for Patrizio as creator
- Backend owns media permissions, publishing state, and content operations

## Core Backend Domains

- `users`
  - Roles: `admin`
- `tracks`
  - Metadata, visibility, audio asset references, lyrics, credits
- `releases`
  - Singles, EPs, albums, artwork, notes, publish state
- `release_tracks`
  - Track ordering and release composition
- `media_assets`
  - Artwork, banners, photos, other uploaded files

## Backend Operations To Support

- `Authentication`
  - Login
  - Session validation
  - Role checks
- `Track Management`
  - Create track
  - Update metadata
  - Set visibility
  - Track CRUD implemented
- `Release Management`
  - Create release
  - Edit release fields
  - Reorder tracks
  - Release CRUD implemented
- `Media Management`
  - Upload assets
  - Persist media metadata
  - Serve uploaded assets locally
  - Associate assets with tracks, releases, and pages
- `Playback Authorization`
  - Return signed playback URL for authorized users or public tracks
  - Deny or restrict private content

## Backend Implementation Phases

- `Phase 1`
  - Add persistent database models
  - Add authentication and admin role protection
  - Keep catalog database-backed
- `Phase 2`
  - Tighten upload flow and media asset handling
- `Phase 3`
  - Replace local signing stub with real signed CDN or storage URLs
  - Add publish state and access-control enforcement

## Immediate Next Steps

- Add file validation, size limits, and media cleanup policies
- Add richer publish-state rules and preview support
- Move from local upload storage to production object storage integration
- Add playlist or release-dedicated playback improvements

## Notes

- Backend repo: `portolio_26_be`
- Default API port: `4200`
- This service should own playback authorization, upload workflows, publishing state, auth, and media access control
