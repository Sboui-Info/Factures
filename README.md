<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/70d05a01-7310-481d-a860-20d719793177

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Single-file app

Build the application with `npm run build`. The `dist/index.html` output contains
the bundled application JavaScript and CSS in one HTML file and can be opened
directly in a browser. Google Fonts are still loaded from Google's CDN when
available; the app falls back to system fonts when offline.
