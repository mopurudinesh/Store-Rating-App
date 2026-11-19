# Frontend

The browser app is built with React, React Router, and Vite. It uses one authenticated session and shows the pages allowed for the signed-in role.

## Pages

| Path | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Sign in to an existing account |
| `/register` | Public | Create a normal user account |
| `/stores` | Normal user | Search stores and add or edit a rating and review |
| `/admin` | Administrator | View platform totals |
| `/admin/users` | Administrator | Find, sort, add, edit, or remove accounts |
| `/admin/stores` | Administrator | Find, sort, add, edit, or remove stores |
| `/owner` | Store owner | View the store average and submitted reviews |

The client redirects between role-specific pages for a clear experience. The API independently checks authentication and roles, so hiding a page does not grant or replace server permissions.

## Source layout

```text
frontend/
├── index.html          # Browser entry document
├── vite.config.js      # Development server and API/upload proxy
└── src/
    ├── main.jsx        # React and router entry point
    ├── App.jsx         # Authentication, routes, pages, and UI components
    ├── api.js          # Fetch wrapper with cookie credentials and errors
    └── styles.css       # Shared layout and responsive styles
```

## Local development

Install all dependencies from the repository root with `npm.cmd run install:all`. Start the API and frontend together from the root with `npm.cmd run dev`.

To start only the frontend, first start the API, then open PowerShell in this folder and run:

```powershell
npm.cmd run dev
```

Vite serves the site at `http://localhost:5173`. Requests to `/api` and `/uploads` are forwarded to `http://127.0.0.1:4000`. If port 5173 is already in use, use the alternate address printed by Vite.

## Production build

From this folder, run:

```powershell
npm.cmd run build
```

Vite writes static output to `dist/`. That generated folder is ignored by Git. The API base can be set at build time with `VITE_API_URL`; in local development the Vite proxy is used by default.
