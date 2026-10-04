# Changelog

All notable changes to this fork will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Removed
- Tracked docker image export `mtp01.tar` (81 MB `docker save` artifact). Docker
  image exports (`*.tar`) are now ignored via `.gitignore`.

### Fixed
- `docker-compose.yaml` now points to `dnlwttnbrg/mediatracker-plus:latest`
  instead of the stale `bonukai/mediatracker` image.
- Working docker `HEALTHCHECK`: probes
  `http://127.0.0.1:${PORT:-7481}/api/configuration` (unauthenticated,
  lightweight endpoint) instead of the broken `curl ${HOSTNAME}:${PORT}`.

## [0.2.1] - 2026-04-06

Inherited from upstream (`dnlwttnbrg/MediaTrackerPlus`). See upstream releases
for the full history.
