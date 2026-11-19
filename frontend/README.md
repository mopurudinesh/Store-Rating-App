# Frontend

The frontend is a React app served by Vite. It contains the sign-in and registration pages, the customer store list and review form, the admin pages, and the store owner dashboard.

## Pages

- `/login` and `/register` are available before signing in.
- `/stores` is the customer store list and rating form.
- `/admin` shows platform totals. `/admin/users` and `/admin/stores` are for account and store management.
- `/owner` shows the store owner's average rating and submitted reviews.

Admins create a store owner and store together from **Users → Add user → Store Owner**. Store owners can edit their name, email, store name, and address from the profile menu; those updates appear in the admin and customer store listings. Deleting a store also removes its owner account and ratings so the owner/store pairing stays intact.

The app redirects users to the page for their role. The API still checks each request's session and permissions; frontend routing is only for navigation.

## Run and build

From the project root, `npm.cmd run install:all` installs dependencies and `npm.cmd run dev` starts both the website and API.

To run only the frontend, start the API first, open a terminal in `frontend/`, and run:

```powershell
npm.cmd run dev
```

Vite normally serves the website at `http://localhost:5173`. It forwards `/api` and `/uploads` requests to the backend at `http://127.0.0.1:4000`. If the port is already in use, use the URL Vite prints instead.

To build the static frontend files, run `npm.cmd run build` from this folder. Vite writes the result to `dist/`; that folder is generated and is not committed. In macOS and Linux terminals, use `npm` instead of `npm.cmd`.

Most page and component code is in `src/App.jsx`. `src/api.js` sends requests with the session cookie, `src/main.jsx` starts React Router, and `src/styles.css` contains the app styles.
