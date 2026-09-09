/** Browser-only resume text extraction (PDF / DOCX / TXT). */
export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.size > 10 * 1024 * 1024) throw new Error("File is larger than 10MB");

  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.js?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out +=
        content.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ") +
        "\n";
    }
    return out.trim();
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser.js");
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value.trim();
  }

  return (await file.text()).trim();
}
