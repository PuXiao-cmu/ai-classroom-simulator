import JSZip from "jszip";
import mammoth from "mammoth";

const MAX_BYTES = 15 * 1024 * 1024;

export async function extractLesson(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("Lesson files must be 15 MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "txt" || file.type === "text/plain") return normalize(buffer.toString("utf8"));
  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return normalize(result.value);
  }
  if (extension === "pptx") {
    const zip = await JSZip.loadAsync(buffer);
    const slideNames = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
    const slides = await Promise.all(slideNames.map(async (name, index) => {
      const xml = await zip.file(name)?.async("text") ?? "";
      const text = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map((match) => decodeXml(match[1])).join(" ");
      return `[slide:${index + 1}] ${text}`;
    }));
    return normalize(slides.join("\n"));
  }
  if (extension === "pdf" || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      pages.push(`[page:${pageNumber}] ${text}`);
    }
    return normalize(pages.join("\n"));
  }
  throw new Error("Use a PDF, PPTX, DOCX, or TXT lesson file.");
}

function decodeXml(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"');
}

function normalize(value: string): string {
  return value.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
