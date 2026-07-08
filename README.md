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
`-- README.md
```

The main application is `beforest-document-generator-branded.html`.

## Run Locally

No dependencies or build step are required.

From this folder, start a static server:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/beforest-document-generator-branded.html
```

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
