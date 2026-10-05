# Changelog

All notable changes to this fork will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- 1-10 rating scale (was 1-5): five-star UI with half-star steps
  (`StarRating`/`StarRatingModal`), `PUT /api/rating` validates 0-10.
  Trakt imports keep their native 1-10 values; Goodreads 1-5 ratings are
  doubled on import.
- Unified "History" page (nav, right of Home): one poster panel per viewing
  across all media types (movies, TV, games, books, audiobooks), most recent
  first. Local title search plus filters by media type, viewing year, genre
  and rated/unrated. Backed by new `GET /api/seen/history` (paginated, one
  entry per `seen` row with episode details).
- History year/genre filters are multi-selects preloaded with the existing
  values (`GET /api/seen/history/facets`), OR-combined within each filter.
  Separate "Seen year" (viewing date) and "Year" (release date) filters.
  Media types are toggle switches, OR-combined (`mediaTypes` param).
- Books and audiobooks now get normalized genres (OpenLibrary subjects and
  Audible category ladders mapped to TMDB-style canonical genres, max 5 per
  item), so the genre filter works across all media types. Existing items
  pick them up on the next metadata refresh.

### Changed
- Existing ratings are doubled by migration `20261004000000_ratingScaleToTen`
  (a 4 becomes an 8). Reversible with `down` (halves them back).

### Removed
- Tracked docker image export `mtp01.tar` (81 MB `docker save` artifact). Docker
  image exports (`*.tar`) are now ignored via `.gitignore`.

### Fixed
- `docker-compose.yaml` now points to `dnlwttnbrg/mediatracker-plus:latest`
  instead of the stale `bonukai/mediatracker` image.
- Working docker `HEALTHCHECK`: probes
  `http://127.0.0.1:${PORT:-7481}/api/configuration` (unauthenticated,
  lightweight endpoint) instead of the broken `curl ${HOSTNAME}:${PORT}`.
- Newly added books now fetch their full metadata (overview, full release
  date, genres) automatically when opening the details page
  (`needsDetails` flag, same as TMDB items), instead of requiring the manual
  update button. Existing OpenLibrary books are flagged by migration
  `20261005000000_openlibraryNeedsDetails`.

## [0.2.1] - 2026-04-06

Inherited from upstream (`dnlwttnbrg/MediaTrackerPlus`). See upstream releases
for the full history.
