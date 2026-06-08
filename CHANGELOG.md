# Changelog - wb-frontend

All notable changes to the CA-bOt Frontend client dashboard will be documented in this file.

## [1.21.0] - 2026-06-08
### Added
- **Instant Sidebar Active Tab Transition**:
  - Implemented client-side tab state tracking to instantly highlight the clicked tab (0ms latency), resolving delay from server-side routing.
  - Automatically resets/synchronizes when the Next.js router updates the `pathname`, maintaining full compatibility with browser history navigation.
- **Minimalist Loading Screen**:
  - Created a global `loading.tsx` component that Next.js instantly mounts during route transitions.
  - Designed a text-free, premium, minimal loading indicator with centered concentric rotating rings and glowing pulses.
- **Team Member Phone & DOB Integration**:
  - Added new `phone` (text) and `date_of_birth` (date) columns to the database profile schema and configured auth creation triggers to automatically sync them.
  - Expanded the Admin member creation modal to include a phone number and Date of Birth (DOB) inputs.
  - Enhanced the team directory listing to display member phone numbers inline with their email and show birthdays with a custom indicator (🎂 badge).
- **Improved Team Directory Action Capabilities**:
  - Added an **Edit** action button opening a modal to update a member's Full Name, Phone Number, and Date of Birth (DOB).
  - Added an **Email** action button initiating a `mailto:` direct link.
  - Added a **WhatsApp** action button opening a chat on `https://wa.me/` with the registered phone number.
  - Added a click-to-copy interface for emails and phone numbers with dynamic feedback badges ("Copy" / "Copied!").

## [1.20.0] - 2026-06-06
### Added
- **Global Feature Toggle Console**:
  - Implemented a hidden system administration console triggered by pressing `Ctrl + X` 5 times in quick succession (within a 3-second window).
  - Restricted the keyboard shortcut listener to run only for users authenticated with the **Admin** role.
  - Designed a premium, light-themed, serious modal dialogue styled consistently with the application's design system (matching the Keyboard Shortcuts modal).
  - Features individual toggles for seven modules: WhatsApp Bot, Internal Chat, Client Profiles, ITR Filing, GST Filing, DSC Management, and Team Members.
  - Persists all module states on the client using `localStorage`.
  - Added page-level route interception to completely block navigation and direct URL access to disabled modules, displaying a clean "Module Temporarily Disabled" notice.
  - Dynamically hides disabled modules from the Sidebar and the Homepage command dashboard module grid.
- **Side Panel Navigation Improvements**:
  - Created a permanent **Dashboard** option at the top of the Sidebar navigation linking directly back to the root gateway (`/`).

## [1.19.0] - 2026-06-06
### Added
- **Self-Service Multi-Tenant Onboarding**:
  - Introduced `companies` table for full multi-tenant data isolation — each firm's clients, filings, and team members are completely separated.
  - Added a **Sign Up** tab to the login page allowing new users to create accounts with email and password (no manual DB setup required).
  - Built a beautiful **"Set Up Your Firm"** onboarding page (`/onboarding`) where new users enter their firm name and are automatically promoted to **Admin** with full access.
  - All data (profiles, clients, itr_filings) is now scoped by `company_id` with JWT-based RLS policies ensuring zero cross-company data leakage.
  - The Sidebar now dynamically displays the firm's name fetched from the database instead of a hardcoded value.
  - Updated `createTeamMember` to automatically assign new members to the admin's company.
  - AuthProvider redirects authenticated users without a company to `/onboarding` automatically.

## [1.18.0] - 2026-06-01
### Added
- **High-Performance Department-Based Access Control (RBAC)**:
  - Transitioned the entire client assignment model from client-level to **service/department level** (specifically within `itr_filings.assigned_to`), allowing clients to have separate assigned staff for different services (ITR, GST, DSC).
  - Expanded `profiles` schema to support `department` field configurations (`ITR`, `GST`, `DSC`, `ALL`).
  - Synced role and department selections directly to Auth `app_metadata` to construct instant, non-recursive Postgres RLS policies based purely on JWT claims.
  - Refactored `createTeamMember` and `updateTeamMemberRoleAndDepartment` server actions to write department changes seamlessly.
  - Enhanced the **Team Directory** page: added a department select dropdown to the member creation modal, side-by-side dropdown overrides inside the directory list, and badges displaying both access tiers and active departments.
  - Revamped **Clients Spreadsheet**: renamed columns to "Assigned (ITR)", filtered the assignable staff dropdown by department for HOD views, and modified drop-down updates to write to the `itr_filings` table.
  - Implemented **Sidebar Department Filtering**: dynamically filters navigation links so that HODs and Employees only see files and settings belonging to their assigned departments.

## [1.17.0] - 2026-05-26
### Added
- **Centralized Document Reminder Settings Panel**:
  - Integrated a new "Reminder Settings" control button directly within the ITR Filing toolbar.
  - Features an active, real-time pulse beacon indicating if the auto-scheduler is enabled (green) or paused (gray).
  - Developed a high-density, glassmorphic Settings modal containing scheduler toggles, adjustable interval range sliders (1h - 48h), last executed logs, and active target lists.
  - Implemented a "Send Reminders Now" action button inside the modal to manually invoke sequential broadcasts instantly with spinner loaders.

## [1.16.0] - 2026-05-23
### Added
- **Integrated Active Services Selection in Profiles Dashboard**:
  - Implemented an elegant "Active Services" checkbox section in the Add New Client and Edit Profile modals.
  - Linked the profile form checkbox dynamically to Supabase database transaction actions.
  - Creating a client with the "ITR Filing" service checked automatically initializes a standard, blank ITR progress record (`itr_filings`) linked to their profile.
  - Editing a profile and checking/unchecking the "ITR Filing" checkbox dynamically creates or unlinks/deletes the respective record in `itr_filings` cleanly in real-time.

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
