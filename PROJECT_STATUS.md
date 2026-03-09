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

## Current Backend Shape

- Runtime: Node.js
- Framework: Fastify
- Validation: Zod
- Auth foundation: JWT plugin installed
- Main feature in progress: protected media delivery for the music platform

## Product Model Direction

- Public music experience for listeners
- Private admin experience for Patrizio as creator
- User system prepared for future listener accounts and gated content
- Backend owns media permissions, publishing state, and content operations

## Core Backend Domains

- `users`
  - Roles: `admin`, later `editor`, `listener`
- `tracks`
  - Metadata, visibility, audio asset references, lyrics, credits
- `releases`
  - Singles, EPs, albums, artwork, notes, publish state
- `release_tracks`
  - Track ordering and release composition
- `shows`
  - Live events, venues, dates, notes
- `writings`
  - Lyrics, notes, stories, drafts
- `media_assets`
  - Artwork, banners, photos, other uploaded files
- `site_sections`
  - Editable homepage and static content blocks
- `playback_permissions`
  - Public, private, preview, or user-gated playback rules

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
- `Live Management`
  - Create show
  - Update show
  - Archive past show
- `Writing Management`
  - Create lyric or note
  - Save draft
  - Publish entry
- `Site Content Management`
  - Edit hero text
  - Edit about text
  - Edit featured sections
  - Edit contact and platform links
- `Playback Authorization`
  - Return signed playback URL for authorized users or public tracks
  - Deny or restrict private content
- `User Features Later`
  - Listener accounts
  - Favorites
  - Private access entitlements

## Backend Implementation Phases

- `Phase 1`
  - Add persistent database models
  - Add authentication and admin role protection
  - Replace in-memory catalog with database-backed queries
- `Phase 2`
  - Add CRUD endpoints for tracks, releases, shows, writings, and site content
  - Add upload flow and media asset storage integration
- `Phase 3`
  - Replace local signing stub with real signed CDN or storage URLs
  - Add publish state, preview rules, and access-control enforcement
- `Phase 4`
  - Add listener user accounts and user-specific features
  - Add analytics and engagement tracking

## Immediate Next Steps

- Add file validation, size limits, and media cleanup policies
- Add show, writing, and site-content entities
- Add richer publish-state rules and preview support
- Move from local upload storage to production object storage integration
- Add analytics and more granular role handling

## Notes

- Backend repo: `portolio_26_be`
- Default API port: `4200`
- This service should own playback authorization, upload workflows, publishing state, auth, and media access control
