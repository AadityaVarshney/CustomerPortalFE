<<<<<<< HEAD
# Customer Portal — Frontend

React 18 + Vite + Tailwind CSS + shadcn/ui

## Quick Start

```bash
# 1. Copy env file
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Run dev server
npm run dev
```

Opens at **http://localhost:3000**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 (concurrent rendering) |
| Build | Vite 5 |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| Real-time | Socket.IO client |
| Styling | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Rich text | TipTap |
| File upload | react-dropzone |
| Charts | Recharts |
| HTTP | Axios with JWT interceptors |

---

## Project Structure

```
src/
  app/              # App.jsx, router.jsx
  features/
    auth/           # LoginPage, RoleGuard, CustomerLayout, InternalLayout
    tickets/        # CustomerDashboard, CreateTicketPage, ticketQueries
    communication/  # (planned)
    projects/       # (planned)
    knowledge-base/ # (planned)
    analytics/      # (planned)
    workspace/      # (planned)
    ai/             # (planned)
    notifications/  # (planned)
  components/
    ui/             # Generic UI primitives
    layout/         # AppShell, Sidebar, TopBar
    shared/         # StatusBadge, PriorityBadge, SLATimer, UserAvatar, Toast, ConfirmDialog
  hooks/            # useAuth, useSocket
  lib/              # axios.js, socket.js, utils.js
  stores/           # authStore, uiStore, notificationStore
```

---

## Roles

| Role | Access |
|---|---|
| `customer_user` | Customer portal (no settings) |
| `customer_admin` | Customer portal + workspace settings |
| `3sc_agent` | Internal portal (no settings) |
| `3sc_lead` | Internal portal (no settings) |
| `3sc_admin` | Full internal portal + system settings |

---

## Environment Variables

```
VITE_API_URL=http://localhost:8080/api/v1
VITE_SOCKET_URL=http://localhost:8080
```

---

## Implemented Modules (v0.1)

- ✅ Project scaffolding (Vite + React 18 + Tailwind + shadcn)
- ✅ Auth module: Login page, RoleGuard, AuthGuard
- ✅ Zustand stores: auth, ui, notifications
- ✅ Axios instance with JWT attach + 401 auto-refresh queue
- ✅ Socket.IO client with query invalidation wiring
- ✅ AppShell layout: Sidebar (collapsible), TopBar, breadcrumbs
- ✅ Customer Dashboard: metric cards, recent tickets, project health
- ✅ Create Ticket: 4-step wizard with AI classify + KB search
- ✅ Shared components: StatusBadge, PriorityBadge, SLATimer, UserAvatar, Toast, ConfirmDialog
- ✅ TanStack Query v5 hooks for tickets
- ✅ Dark theme with glass morphism, DM Sans + Syne fonts

## Planned (next iterations)

- 🔲 Ticket Detail (split-pane layout)
- 🔲 Ticket List with filters
- 🔲 ThreadComposer (TipTap)
- 🔲 AIAssistDrawer
- 🔲 Projects page + timeline
- 🔲 Knowledge Base + AI search
- 🔲 Analytics dashboard (Recharts)
- 🔲 Notifications centre
- 🔲 Workspace Settings
- 🔲 Internal staff views
=======
# CustomerPortalFE
>>>>>>> cb8c88d23c84f399df450be76d31ddca276e956d
