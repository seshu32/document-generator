# Beforest Document Generator

A standalone static HTML document generator for Beforest documents.

The app currently supports:

- Tax Invoice
- Memorandum of Understanding (MoU)
- Expression of Interest (EOI) and Service Agreement

## Project Structure

```text
.
|-- beforest-document-generator-branded.html
|-- Dockerfile
|-- package.json
|-- README.md
`-- server.js
```

The main application is `beforest-document-generator-branded.html`. Node serves it at `/`.

## Run Locally

Install dependencies and start the server:

```bash
npm install
APP_PASSWORD=change-me SHEET_WEBAPP_URL=https://script.google.com/macros/s/.../exec npm start
```

Then open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/healthz
```

## Deploy to Coolify

Use this repo as a Node.js app or Docker app.

Recommended Coolify settings:

```text
Build pack: Nixpacks or Dockerfile
Start command: npm start
Port: 3000
Health check path: /healthz
```

Environment variables:

```text
APP_PASSWORD=required app login password
SESSION_SECRET=long random string for stable login sessions
SHEET_WEBAPP_URL=Google Apps Script Web App URL for sheet sync
```

`APP_PASSWORD` is required. If it is missing, the app returns a configuration error instead of opening the document generator.

## External Assets and Services

The app uses:

- Supabase-hosted Beforest / Arizona font files.
- Hosted Beforest logo image:
  `https://i.ibb.co/Xr9S2Tk4/23-Beforest-Black-with-Tagline.png`
- Google Apps Script Web App endpoint for optional Google Sheets sync.

Saving a document stores a local browser history in `localStorage`. If the configured Google Apps Script endpoint is available, the app also attempts to send the generated document data to Google Sheets.

## Notes

- This is a static HTML app.
- There is no `package.json`.
- There are no npm dependencies.
- There is no build or deployment pipeline in this repo yet.
