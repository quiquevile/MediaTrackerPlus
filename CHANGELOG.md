# Changelog

All notable changes to this fork will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- 1-10 rating scale (was 1-5): five-star UI with half-star steps
  (`StarRating`/`StarRatingModal`), `PUT /api/rating` validates 0-10.
  Trakt imports keep their native 1-10 values; Goodreads 1-5 ratings are
  doubled on import.
- Unified "History" page (nav, right of Home): one panel per viewing
  across all media types (movies, TV, games, books, audiobooks), most recent
  first, reusing the standard grid item (dimmed star when unrated,
  first-unwatched-episode and unwatched-count badges for shows, episode
  rating modal). Local title search plus filters by media type toggles,
  viewing/released year, genre and rated/unrated. Backed by new
  `GET /api/seen/history` (paginated, one entry per `seen` row with episode
  details).
- History episode cards show three rating stars (show yellow, season indigo,
  episode green), each opening its own vote/review dialog. New `ratingFilter`
  (`rated`, `unrated`, `unrated-show`, `unrated-season`, `unrated-episode`).
- History year/genre filters are multi-selects preloaded with the existing
  values (`GET /api/seen/history/facets`), OR-combined within each filter.
  Separate "Seen year" (viewing date) and "Year" (release date) filters.
  Media types are toggle switches, OR-combined (`mediaTypes` param).
- Books and audiobooks now get normalized genres (OpenLibrary subjects and
  Audible category ladders mapped to TMDB-style canonical genres, max 5 per
  item), so the genre filter works across all media types. Existing items
  pick them up on the next metadata refresh.
- Plex webhook visibility: every delivery is logged (event, title, Plex
  account/player, parsed ids, target user) with warnings on unmatched items,
  plus optional full-payload dump via `PLEX_WEBHOOK_DEBUG=true`. Also fixes
  a crash on payloads without `Guid`s.
- Plex webhooks can be restricted by account (`PLEX_ALLOWED_ACCOUNTS` /
  `PLEX_DENIED_ACCOUNTS`, comma-separated, case-insensitive, deny wins).

### Changed
- Existing ratings are doubled by migration `20261004000000_ratingScaleToTen`
  (a 4 becomes an 8). Reversible with `down` (halves them back).
- Docker workflow is now fully local: `compose.yaml` builds
  `mediatracker-plus:local` from source (no remote image). The Dockerfile no
  longer compiles libvips from source; sharp's prebuilt binaries are used.

### Removed
- Tracked docker image export `mtp01.tar` (81 MB `docker save` artifact). Docker
  image exports (`*.tar`) are now ignored via `.gitignore`.

### Fixed
- Top menu is now sticky: it stays visible while the page content scrolls
  (modal dialogs still open above it).
- Metadata refreshes no longer fail with `UNIQUE constraint failed` when
  TMDB reassigns episode/season `tmdbId`s: the stale row releases the id
  (user data like seen/rating entries is preserved) and a single bad
  season/episode no longer aborts the whole show update.
- `docker-compose.yaml` now points to `dnlwttnbrg/mediatracker-plus:latest`
  instead of the stale `bonukai/mediatracker` image.
- Working docker `HEALTHCHECK`: probes `/api/configuration` on the container
  hostname (the address the server binds to) instead of the broken
  `curl ${HOSTNAME}:${PORT}`.
- Newly added books now fetch their full metadata (overview, full release
  date, genres) automatically when opening the details page
  (`needsDetails` flag, same as TMDB items), instead of requiring the manual
  update button. Existing OpenLibrary books are flagged by migration
  `20261005000000_openlibraryNeedsDetails`.
- Voting from the History page now refreshes the list immediately (the
  `seenHistory` query cache is invalidated on rating changes).
- Star rating supports drag-to-rate with a zero zone (drag left of or below
  the stars to clear the vote), on mouse and touch; clicking the current
  value also clears it.
- Cleared (NULL) and zero votes count as unrated again in the Rated/Unrated
  filters, same as never-rated items, on the History page and everywhere
  else.
- History rating filters are scoped to the entry's own levels: a season vote
  no longer marks other seasons' episodes as rated.
- Secrets are masked in logs: tokens in request URLs and password-like
  fields in request bodies are logged as `***`.

## [0.2.1] - 2026-04-06

Inherited from upstream (`dnlwttnbrg/MediaTrackerPlus`). See upstream releases
for the full history.
