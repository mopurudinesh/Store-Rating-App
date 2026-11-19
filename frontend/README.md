# Frontend

The Rate Store interface is built with React and Vite.

## Run it

Install the project dependencies from the repository root with `npm.cmd run install:all`, then start both parts of the app from the root with `npm.cmd run dev`. The website normally opens at [http://localhost:5173](http://localhost:5173).

To run only the frontend, start the API first, then from this folder run:

```powershell
npm.cmd run dev
```

Vite forwards `/api` and `/uploads` requests to the Express API at `http://127.0.0.1:4000`. If port 5173 is already occupied, Vite prints the alternate address it chose.

## Production build

From this folder, run:

```powershell
npm.cmd run build
```

The generated static files are written to `dist/`. The folder is build output and is not committed.
