# Changelog - wb-frontend

All notable changes to the CA-bOt Frontend client dashboard will be documented in this file.

## [1.10.0] - 2026-05-23
### Added
- **Multi-Dimensional Filters Bar**:
  - Designed and built a premium, monotone multi-dimensional filter bar right under the client profiles toolbar.
  - **Account Status Dropdown**: Filter clients by status (Pending Approval, Approved, Suspended).
  - **Services Dropdown**: Filter by service type (Has Active ITR or No Active Services).
  - **KYC Docs Dropdown**: Filter based on document status (PAN Uploaded/Missing, Aadhaar Uploaded/Missing, Both Uploaded, or Any Missing).
  - **Interactive Clear Filters Action**: Appends a dynamic "Clear Filters" badge that instantly resets all selected options and search queries to defaults.
  - **Dynamic Pagination Handshake**: Automatically resets page counters to 1 whenever any filter dropdown selection changes.

## [1.9.0] - 2026-05-23
### Added
- **Services Column in Client Profiles Table**:
  - Added a new "Services" column to the client profiles spreadsheet, dynamically showing which services (ITR, GST, DSC) each client has opted for.
  - Queries `itr_filings` relation from Supabase to detect active ITR enrollments.
  - Clickable service tags: clicking "ITR" navigates directly to the ITR Filing dashboard where that client's filing details are displayed.
  - GST and DSC tags are prepared but commented out until those modules go live.

## [1.8.0] - 2026-05-23
### Added
- **Interactive KYC Document Preview Dialog**:
  - Replaced immediate download anchors on the Client Profiles table with sleek interactive click-to-preview buttons.
  - Implemented a custom high-fidelity, split-screen document preview modal in `ClientsDashboard.tsx` matching the ITR filing document view styling.
  - Displays PDFs inside a rich iframe and images in high-resolution, fit-to-screen viewports, accompanied by a prominent monotone "Download Document" action button.
