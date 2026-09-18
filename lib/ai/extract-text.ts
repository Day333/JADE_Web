import "server-only";

/** Extract plain text from an uploaded resume (PDF, DOCX or TXT). */
export async function extractResumeText(bytes: ArrayBuffer, fileName: string, mimeType?: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: false });
    return (Array.isArray(text) ? text.join("\n") : text).trim();
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value.trim();
  }
  return new TextDecoder().decode(bytes).trim();
}
