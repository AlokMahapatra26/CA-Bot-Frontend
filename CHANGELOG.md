# Changelog - wb-frontend

All notable changes to the CA-bOt Frontend client dashboard will be documented in this file.

## [1.8.0] - 2026-05-23
### Added
- **Interactive KYC Document Preview Dialog**:
  - Replaced immediate download anchors on the Client Profiles table with sleek interactive click-to-preview buttons.
  - Implemented a custom high-fidelity, split-screen document preview modal in `ClientsDashboard.tsx` matching the ITR filing document view styling.
  - Displays PDFs inside a rich iframe and images in high-resolution, fit-to-screen viewports, accompanied by a prominent monotone "Download Document" action button.

## [1.7.0] - 2026-05-23
### Added
- **Horizontal Footer Alignment**:
  - Unified the vertical sizing of the sidebar bottom status footer and the right pane table pagination footer with a exact fixed height (`h-[38px]`).
  - Standardized sidebar connection status indicators into a flat, row flex layout to keep both separator lines aligned precisely.

## [1.6.0] - 2026-05-23
### Added
- **Spreadsheet-Style Table Pagination**:
  - Appended page-by-page rendering to the primary clients data grid.
  - Implemented rows per page selection (`10`, `25`, `50`, `100`).
  - Integrated click buttons to move back (Previous) and forward (Next) pages seamlessly.
  - Programmed automated page resets (back to page 1) whenever an active search query is entered.

## [1.5.0] - 2026-05-23
### Added
- **Manual "+ Add Client" Action**:
  - Created a clean, flat manual profile creator styled as a monotone border-outline control with a `Plus` icon.
  - Automatically sanitizes 10-digit Indian mobile numbers (appending `91`) and maps default bot stages to `REGISTERED`.
- **Decluttered CSV Tools Dropdown**:
  - Replaced bulk CSV file inputs and download template links with an interactive dropdown selection toggle containing a `ChevronDown` icon.

## [1.4.0] - 2026-05-23
### Added
- **Client Profiles Editor Modal**:
  - Built an "Edit" popup action triggering a high-density form sheet modifying profile parameters directly.
