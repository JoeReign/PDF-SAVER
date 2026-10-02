(async () => {
  'use strict';
  const findViewer = (win, depth = 0) => {
    try {
      if (win.PDFViewerApplication?.pdfDocument) return win;
      if (depth < 5) for (let i = 0; i < win.frames.length; i++) {
        const match = findViewer(win.frames[i], depth + 1);
        if (match) return match;
      }
    } catch (_) { /* Cross-origin frames require selecting their Console context. */ }
    return null;
  };
  const win = findViewer(window);
  if (!win) {
    alert('No loaded PDF.js document found. Wait for the handbook to load. In DevTools Console, change the context dropdown from “top” to the PDF viewer frame, then run this script again.');
    return;
  }
  const doc = win.PDFViewerApplication.pdfDocument;
  const dom = win.document;
  const id = 'handbook-save-panel';
  if (dom.getElementById(id)) { dom.getElementById(id).scrollIntoView(); return; }
  const panel = dom.createElement('section');
  panel.id = id;
  panel.style.cssText = 'position:fixed;top:55px;right:20px;z-index:2147483647;background:#fff;color:#14213d;padding:20px;border:2px solid #2946bf;border-radius:12px;box-shadow:0 8px 40px #0007;width:310px;font:14px/1.5 system-ui;text-align:left';
  const title = dom.createElement('strong');
  title.textContent = `Save handbook · ${doc.numPages} pages`;
  const status = dom.createElement('p');
  status.textContent = 'Choose original PDF for selectable text and links. Page images create a larger PDF without selectable text.';
  panel.append(title, status);
  const button = (label, action) => {
    const b = dom.createElement('button'); b.textContent = label;
    b.style.cssText = 'display:block;width:100%;margin-top:8px;padding:9px;border:1px solid #2946bf;border-radius:6px;background:#eff3ff;color:#14213d;cursor:pointer;font:inherit';
    b.onclick = action; panel.append(b); return b;
  };
  let cancelled = false, busy = false, activeRender = null;
  const download = (blob, name) => {
    const url = win.URL.createObjectURL(blob), a = dom.createElement('a');
    a.href = url; a.download = name; dom.body.append(a); a.click(); a.remove();
    win.setTimeout(() => win.URL.revokeObjectURL(url), 60000);
  };
  const safeName = (dom.title || 'Python Handbook').replace(/[\\/:*?"<>|]/g, '-').slice(0, 100).replace(/\.pdf$/i, '');
  const run = async (action) => {
    if (busy) return;
    busy = true; cancelled = false; original.disabled = images.disabled = true;
    try { await action(); }
    catch (e) { status.textContent = cancelled ? 'Cancelled. No partial PDF saved.' : `Could not save: ${e.message}. Try the other option, or select the PDF frame in Console.`; }
    finally { busy = false; activeRender = null; original.disabled = images.disabled = false; }
  };
  const original = button('Save original PDF', () => run(async () => {
    status.textContent = 'Collecting the complete PDF…';
    const bytes = await doc.getData();
    if (cancelled) return;
    if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('The viewer returned invalid PDF data');
    download(new Blob([bytes], {type:'application/pdf'}), safeName + '.pdf');
    status.textContent = `Download requested: original PDF, ${doc.numPages} pages. Check your browser downloads.`;
  }));
  const images = button('Save all pages as images in a PDF', () => run(async () => {
    const parts = [], offsets = [0], encoder = new TextEncoder(); let length = 0;
    const put = data => { const bytes = typeof data === 'string' ? encoder.encode(data) : data; parts.push(bytes); length += bytes.length; };
    const object = (id, body, stream) => {
      offsets[id] = length; put(`${id} 0 obj\n${body}\n`);
      if (stream) { put('stream\n'); put(stream); put('\nendstream\n'); }
      put('endobj\n');
    };
    put('%PDF-1.4\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, `<< /Type /Pages /Count ${doc.numPages} /Kids [${Array.from({length:doc.numPages}, (_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
    for (let n = 1; n <= doc.numPages; n++) {
      if (cancelled) throw new Error('Cancelled');
      status.textContent = `Rendering page ${n} of ${doc.numPages}… Keep this tab open.`;
      const page = await doc.getPage(n), base = page.getViewport({scale:1});
      const viewport = page.getViewport({scale:Math.min(2, 2400 / Math.max(base.width, base.height))});
      const canvas = dom.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      try {
        activeRender = page.render({canvasContext:canvas.getContext('2d'), viewport, background:'rgb(255,255,255)'});
        await activeRender.promise; activeRender = null;
        if (cancelled) throw new Error('Cancelled');
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
        if (!blob) throw new Error('Image encoding failed');
        const jpeg = new Uint8Array(await blob.arrayBuffer()), p = 3+(n-1)*3;
        object(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${base.width} ${base.height}] /Resources << /XObject << /Im ${p+1} 0 R >> >> /Contents ${p+2} 0 R >>`);
        object(p+1, `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
        const commands = encoder.encode(`q\n${base.width} 0 0 ${base.height} 0 0 cm\n/Im Do\nQ\n`);
        object(p+2, `<< /Length ${commands.length} >>`, commands);
      } finally { canvas.width = canvas.height = 0; }
      await new Promise(resolve => win.setTimeout(resolve, 0));
    }
    if (cancelled) throw new Error('Cancelled');
    const xref = length;
    put(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
    for (let i = 1; i < offsets.length; i++) put(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
    put(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    download(new Blob(parts, {type:'application/pdf'}), safeName + '-page-images.pdf');
    status.textContent = `Download requested: ${doc.numPages} page images. Check your browser downloads.`;
  }));
  button('Cancel / Close', () => { if (busy) { cancelled = true; activeRender?.cancel(); status.textContent = 'Cancelling…'; } else panel.remove(); });
  dom.body.append(panel);
})();
