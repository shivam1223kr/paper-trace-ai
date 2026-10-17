# PaperTrace AI

A self-contained hackathon prototype for tracing potential examination-paper leaks. It supports a recipient-specific watermark payload, image-based evidence intake, paper matching, confidence scores, forensic audit records, and CSV export.

## Run locally

Node.js 18+ is the only requirement.

```powershell
node server.js
```

Open `http://localhost:3000`.

## Demo flow

1. Register a paper and upload an image/screenshot of it.
2. Issue recipient-specific copies. Download the generated watermarked visual proof sheet for each recipient.
3. Upload a suspected leaked image in **Analyse Leak**. The prototype reads its embedded PaperTrace payload where present, and otherwise uses image/content fingerprints to identify the paper.
4. Review the evidence score and audit trail. A match is explicitly a *potential source*, not proof of individual responsibility.

## Important prototype boundary

The browser payload is an educational/demo robust-marking layer, not production-grade security. A production deployment should use a validated print-camera watermark algorithm (DCT/DWT plus error correction), server-side encrypted key management, authenticated accounts, object storage, a real database, and legal/investigative review.

## Deploy on Render

This repository includes a Render Blueprint. In Render, choose **New → Blueprint**, connect this repository, and deploy the `paper-trace-ai` web service. Render assigns it a public `onrender.com` URL.

This is a public demo with no sign-in. Do not enter real exam papers, recipient details, or investigation data. The app stores data in `data.json`; Render's free service has an ephemeral filesystem, so demo changes can be lost after restarts, redeploys, or idle spin-downs. Use a persistent database and add authentication before production use.

## Deploy with Git

```powershell
git init
git add .
git commit -m "Build PaperTrace AI"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/papertrace-ai.git
git push -u origin main
```

The app can also run locally with `node server.js`; Render runs the same Node server using `npm start`.
