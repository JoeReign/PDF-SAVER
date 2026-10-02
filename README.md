# Thinkific PDF Saver

Save a PDF that is already loaded in a compatible PDF.js viewer. Built for sites that disable PDF downloading, this tool also works on other sites that expose PDFViewerApplication.pdfDocument.

## Features

- Download the original PDF, keeping selectable text and links.
- Export all pages as images in one PDF, in document order.
- Detect the page count automatically.
- Show rendering progress and allow cancellation.
- Run locally in your signed-in browser without external libraries or content uploads.

## How to use

1. Open `index.html` locally for instructions and a **Copy script** button, or read `save-pdf.js` directly.
2. Open your PDF lesson and wait until the document has loaded.
3. Open Developer Tools (**F12** or **Ctrl + Shift + J**) and select **Console**.
4. Paste the script and press Enter. Read any browser paste warning and review the code before proceeding.
5. If the document is not found, choose the PDF viewer iframe from the Console context dropdown (often named `viewer.html`) and run the script again.
6. In the new panel, choose **Save original PDF**, or **Save all pages as images in a PDF**.
7. Keep the tab open until finished and check your browser downloads.

The image export does not require scrolling through the handbook. It preserves page proportions but loses selectable text and links and may produce a much larger file.

## Compatibility and limitations

Requires a loaded PDF.js viewer exposing `PDFViewerApplication.pdfDocument`. Cross-origin frames must be selected through the Console context dropdown. Chrome's built-in PDF viewer and other viewer implementations are unsupported.

Desktop browsers with Developer Tools are the intended workflow. This is a Console script, not an extension or a universal downloader. It does not sign in, scrape entire courses, or handle DRM. Large image exports can use substantial memory.

The export callbacks and generated PDF structure were checked with a simulated three-page document including mixed page orientations. The authenticated Thinkific lesson has not been tested live.

## Optional GitHub Pages

This repository includes `index.html` at the root. To host the instruction page, open repository **Settings → Pages**, select deployment from the `main` branch and root folder, and save. The hosted page gives instructions and copies the script; run the script on the actual lesson page.

## Files

| File | Purpose |
| --- | --- |
| `save-pdf.js` | Script to run in the PDF viewer's Console |
| `index.html` | Standalone instructions and Copy script button |
| `README.md` | Repository documentation |

No course PDFs, credentials, or personal data are included in this repository.
