# Changelog - wb-frontend

All notable changes to the CA-bOt Frontend client dashboard will be documented in this file.

## [1.15.0] - 2026-05-23
### Added
- **ITR Filing Route Relocation**:
  - Relocated the entire ITR Filing Dashboard from the root `/` page to a dedicated, clean `/itr` route.
  - Updated all sidebar navigation menu linkages and the `Alt + 3` global keyboard routing handlers to redirect dynamically to `/itr`.
  - Updated the active "Services" table cell shortcut badge on the client profiles dashboard to point directly to `/itr`.
- **Root Executive Dashboard Gateway**:
  - Created a professional, minimalist executive gateway page at the root `/` URL.
  - Features an intuitive modular overview showing all active systems (WhatsApp Bot, Client Profiles, ITR Filing) and placeholders for coming-soon systems (GST, DSC).

## [1.14.0] - 2026-05-23
### Added
- **Raw, Ultra-Minimalist Sans-Serif Conversation State Tree**:
  - Re-designed the interactive decision tree modal into a highly quiet, monotone, high-density raw text tree.
  - Removed all emojis, icon decorations, and non-default custom monospace fonts for zero-friction Swiss minimalism.
  - Implemented sleek, collapsible CSS `<details>` blocks for each primary tax pathway (Salary, Business, Investor, Real Estate Property, and Multi-Document Loops) to easily inspect stages.
  - Incorporated clear database statuses (e.g., `AWAITING_FORM16`, `AWAITING_BANK_STATEMENT`) and verification rules matching the dashboard's unified typography.
  - Rendered a raw backtrack interceptor warning alert detailing `back` and `undo` rollbacks.
  - Removed all technical version identifiers (`flow_tree_engine.sys`, `flow_tree_engine.v1.5.0`) to provide a clean, pristine product presentation.

## [1.13.0] - 2026-05-23
### Added
- **Developer Settings Backdoor / Bulk Profile Deletion**:
  - Implemented a secure key combination trigger (`Ctrl + D` twice within 800ms) that toggles developer modes.
  - Added a premium, glassmorphic red "Delete All Profiles" button to the clients toolbar.
  - Designed and built a stunning, minimalist custom modal dialog matching the dashboard's design system (blur filters, red border accents, monospace input, success/error handlers) that completely replaces the browser's native `alert`, `confirm`, and `prompt` dialogs.
  - Set up a highly secure multi-step custom verification flow (confirmation page → dynamic security word match check `"DELETE ALL"` → loading spinner state → elegant success/error feedback pages).
  - Implemented the `deleteAllClients` server action inside `wb-frontend/app/actions.ts` to perform bulk database wipe.

## [1.12.0] - 2026-05-23
### Added
- **Global Keyboard Shortcuts & interactive modal**:
  - Implemented an elegant shortcuts system to streamline expert workflows.
  - **Ctrl + K** or **Cmd + K**: Autofocus and select active search bars on all dashboards.
  - **Alt + [1-5]**: Swift keyboard-based page routing across primary dashboard navigation modules.
  - **Escape**: Blur active input selectors.
  - **Shortcuts Sidebar Tab**: Integrated a dedicated, interactive "Shortcuts" navigation button in the sidebar that displays all actions in a premium, beautifully aligned Keyboard Shortcuts modal.
  - **Inline Search Bar Indicator Badge**: Rendered a sleek, lightweight `Ctrl+K` key helper inside the search bar when no query is typed to guide standard user behavior.
- **Dynamic Unified Changelog Tab & Modal**:
  - Designed and built a "Changelog" button/tab at the bottom of the sidebar.
  - Added a backend server action to dynamically read both `wb-frontend/CHANGELOG.md` and `wb-backend/CHANGELOG.md` directly from the server filesystem.
  - Designed a high-fidelity modal displaying side-by-side or tabbed views of both frontend and backend historical changelogs with clean, markdown-style formatting and premium spacing.

## [1.11.0] - 2026-05-23
### Added
- **ITR Filing Pagination & Filter System**:
  - Brought complete parity to the ITR Filing dashboard (`ClientDashboard.tsx`) with the same advanced monotone Excel-style layout.
  - **Filing Status Filter**: Dropdown to filter records by filing progression (Awaiting Docs, Docs Submitted, Docs Verified, Filing In Progress, Filed, or Rejected).
  - **Income Source Filter**: Dropdown to isolate specific client income classifications (Salaried, Business, Investor, or Property).
  - **Clear Filters Utility**: Immediate action badge to restore all inputs.
  - **Pagination Footers**: Implemented exactly identical pagination controls with interactive next/previous triggers.
  - **Rows per Page Selection**: Configured standard high-density dropdown options (10, 25, 50, 100) resetting dynamic records layout.

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
