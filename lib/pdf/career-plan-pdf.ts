import "server-only";

import PDFDocument from "pdfkit";
import type { CareerPlan } from "@/lib/ai/career-plan";
import { APP_NAME } from "@/lib/config";

/**
 * The full AI Career Plan as a downloadable PDF (a Pro feature).
 * Uses PDFKit with the built-in Helvetica fonts, so no font files ship with
 * the app. Phrases the plan marks with **...** render in emerald bold, the
 * same emphasis the web page gives them.
 */
export interface PlanPdfData {
  plan: CareerPlan;
  personName: string | null;
  careerTitle: string;
  readiness: number;
  /** e.g. "19 September 2026" */
  generatedOn: string;
  /** Model name, or null for the rule-based planner. */
  model: string | null;
  jobs: { title: string; company: string; location: string | null; match: number; why: string }[];
  careers: { title: string; match: number; why: string }[];
}

const REG = "Helvetica";
const BOLD = "Helvetica-Bold";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const EMERALD = "#059669";
const EMERALD_DARK = "#065f46";
const BORDER = "#e2e8f0";
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MX = 56;
const CW = PAGE_W - MX * 2;

/** Helvetica is WinAnsi-only: swap arrows and drop anything it can't encode. */
function toWinAnsi(text: string) {
  return text
    .replace(/→|⟶|⇒/g, "->")
    .replace(/←|⇐/g, "<-")
    .replace(/✓|✔/g, "+")
    .replace(/[^\x20-\x7E -ÿ‘’“”–—•…€™]/g, "");
}

/** Split "a **b** c" into runs; the **...** runs render bold emerald. */
function runs(text: string) {
  return toWinAnsi(text)
    .split(/\*\*([^*]+)\*\*/g)
    .map((part, i) => ({ text: i % 2 === 1 ? part : part.replaceAll("**", ""), bold: i % 2 === 1 }))
    .filter((r) => r.text.length > 0);
}

type Doc = InstanceType<typeof PDFDocument>;

function ensure(doc: Doc, height: number) {
  if (doc.y + height > PAGE_H - doc.page.margins.bottom) doc.addPage();
}

/** Write text at x with **highlights** in emerald bold; advances doc.y. */
function rich(doc: Doc, text: string, x: number, width: number, opts: { size?: number; color?: string; bold?: boolean; lineGap?: number } = {}) {
  const parts = runs(text);
  if (parts.length === 0) return;
  doc.fontSize(opts.size ?? 10.5);
  parts.forEach((part, i) => {
    doc.font(part.bold || opts.bold ? BOLD : REG).fillColor(part.bold ? EMERALD_DARK : opts.color ?? TEXT);
    const textOpts = { width, lineGap: opts.lineGap ?? 2, continued: i < parts.length - 1 };
    if (i === 0) doc.text(part.text, x, doc.y, textOpts);
    else doc.text(part.text, textOpts);
  });
}

function sectionTitle(doc: Doc, title: string) {
  ensure(doc, 70);
  doc.moveDown(1.4);
  doc.font(BOLD).fontSize(9).fillColor(EMERALD).text(title.toUpperCase(), MX, doc.y, { characterSpacing: 1.4 });
  const y = doc.y + 3;
  doc.moveTo(MX, y).lineTo(PAGE_W - MX, y).lineWidth(0.7).strokeColor(BORDER).stroke();
  doc.y = y + 10;
}

function bullet(doc: Doc, text: string, opts: { marker?: "dot" | "box"; color?: string } = {}) {
  ensure(doc, 26);
  const y = doc.y;
  if (opts.marker === "box") {
    doc.rect(MX + 1, y + 1.5, 7, 7).lineWidth(1).strokeColor(EMERALD).stroke();
  } else {
    doc.circle(MX + 4, y + 5, 1.7).fillColor(EMERALD).fill();
  }
  doc.y = y;
  rich(doc, text, MX + 16, CW - 16, { color: opts.color });
  doc.moveDown(0.35);
}

function labelled(doc: Doc, label: string, text: string) {
  ensure(doc, 26);
  const y = doc.y;
  doc.font(BOLD).fontSize(10.5).fillColor(EMERALD_DARK).text(`${label}: `, MX + 16, y, { continued: true, lineGap: 2, width: CW - 16 });
  rich(doc, text, MX + 16, CW - 16, { color: MUTED });
  doc.moveDown(0.35);
}

function header(doc: Doc, data: PlanPdfData) {
  // Brand row: the lighthouse mark and wordmark (same shapes as components/app/logo.tsx).
  const top = MX - 8;
  doc.save().translate(MX, top).scale(0.75);
  const grad = doc.linearGradient(10, 2, 22, 30);
  grad.stop(0, "#10b981").stop(1, "#059669");
  doc.fillOpacity(0.5).fill("#22d3ee");
  doc.path("M12.6 8.8 L1 5.2 L1 12.4 Z").fill("#22d3ee");
  doc.path("M19.4 8.8 L31 5.2 L31 12.4 Z").fill("#22d3ee");
  doc.fillOpacity(1);
  doc.path("M16 2.2 L20.2 6.6 L11.8 6.6 Z").fill(grad);
  doc.roundedRect(13.1, 6.6, 5.8, 4.6, 0.8).fill("#fbbf24");
  doc.path("M13 11.2 L19 11.2 L21.4 28 L10.6 28 Z").fill(grad);
  doc.roundedRect(8.6, 28, 14.8, 2.4, 1.2).fill(grad);
  doc.moveTo(12.4, 16.6).lineTo(19.6, 16.6).moveTo(11.8, 21.6).lineTo(20.2, 21.6).lineWidth(1.5).strokeOpacity(0.5).strokeColor("#ffffff").stroke();
  doc.strokeOpacity(1);
  doc.restore();
  doc.font(BOLD).fontSize(13).fillColor(TEXT).text(APP_NAME, MX + 30, top + 5, { lineBreak: false });
  doc.font(BOLD).fontSize(9).fillColor(EMERALD).text("AI CAREER PLAN", MX, top + 8, { width: CW, align: "right", characterSpacing: 1.4 });
  doc.y = top + 34;

  // Headline and context.
  rich(doc, data.plan.headline, MX, CW, { size: 19, bold: true, lineGap: 3 });
  doc.moveDown(0.4);
  const who = [data.personName, `Goal: ${data.careerTitle}`, data.plan.horizon].filter(Boolean).join("   ·   ");
  doc.font(REG).fontSize(9.5).fillColor(MUTED).text(toWinAnsi(who), MX, doc.y, { width: CW });
  doc.moveDown(0.9);

  // Career Readiness bar.
  const y = doc.y;
  doc.font(BOLD).fontSize(9.5).fillColor(TEXT).text(`Career Readiness today: ${data.readiness}%`, MX, y, { lineBreak: false });
  const barX = MX + 170;
  const barW = CW - 170;
  doc.roundedRect(barX, y + 1, barW, 7, 3.5).fillColor("#e2e8f0").fill();
  doc.roundedRect(barX, y + 1, Math.max(7, (barW * Math.min(data.readiness, 100)) / 100), 7, 3.5).fillColor(EMERALD).fill();
  doc.y = y + 18;

  rich(doc, data.plan.summary, MX, CW, { size: 10.5, color: TEXT, lineGap: 3 });
}

export function buildCareerPlanPdf(data: PlanPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MX - 8, bottom: 58, left: MX, right: MX },
      bufferPages: true,
      info: { Title: `${APP_NAME} AI Career Plan - ${toWinAnsi(data.careerTitle)}`, Author: APP_NAME },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { plan } = data;
    header(doc, data);

    sectionTitle(doc, "Where you are");
    doc.font(BOLD).fontSize(10.5).fillColor(TEXT).text("Your strengths", MX, doc.y);
    doc.moveDown(0.3);
    plan.whereYouAre.strengths.forEach((s) => bullet(doc, s));
    doc.moveDown(0.4);
    doc.font(BOLD).fontSize(10.5).fillColor(TEXT).text("Gaps to close", MX, doc.y);
    doc.moveDown(0.3);
    plan.whereYouAre.gaps.forEach((g) => bullet(doc, g));

    sectionTitle(doc, "Your strategy");
    plan.strategy.forEach((s, i) => {
      ensure(doc, 44);
      const y = doc.y;
      doc.font(BOLD).fontSize(10.5).fillColor(EMERALD).text(`0${i + 1}`, MX, y, { lineBreak: false });
      doc.y = y;
      rich(doc, s.title, MX + 22, CW - 22, { bold: true });
      rich(doc, s.detail, MX + 22, CW - 22, { color: MUTED, size: 10 });
      doc.moveDown(0.6);
    });

    sectionTitle(doc, "The plan, phase by phase");
    plan.phases.forEach((phase, i) => {
      ensure(doc, 96);
      const y = doc.y;
      doc.circle(MX + 7, y + 6, 7).fillColor(EMERALD).fill();
      doc.font(BOLD).fontSize(8.5).fillColor("#ffffff").text(String(i + 1), MX + 1, y + 2.5, { width: 12, align: "center", lineBreak: false });
      doc.y = y;
      doc.font(BOLD).fontSize(12).fillColor(TEXT).text(toWinAnsi(phase.name), MX + 22, y, { lineBreak: false });
      doc.font(REG).fontSize(9).fillColor(MUTED).text(toWinAnsi(phase.timeframe), MX, y + 2, { width: CW, align: "right" });
      doc.y = y + 17;
      rich(doc, phase.goal, MX + 22, CW - 22, { color: MUTED, size: 10 });
      doc.moveDown(0.35);
      const inset = 22;
      phase.actions.forEach((a) => {
        ensure(doc, 26);
        const ay = doc.y;
        doc.circle(MX + inset + 4, ay + 5, 1.7).fillColor(EMERALD).fill();
        doc.y = ay;
        rich(doc, a, MX + inset + 14, CW - inset - 14);
        doc.moveDown(0.3);
      });
      if (phase.deliverable) {
        ensure(doc, 26);
        const dy = doc.y + 2;
        doc.font(BOLD).fontSize(9.5).fillColor(EMERALD_DARK).text("Deliverable: ", MX + inset, dy, { continued: true, width: CW - inset, lineGap: 2 });
        rich(doc, phase.deliverable, MX + inset, CW - inset, { size: 9.5, color: TEXT });
      }
      doc.moveDown(0.8);
    });

    sectionTitle(doc, "Start this week");
    plan.thisWeek.forEach((t) => bullet(doc, t, { marker: "box" }));

    sectionTitle(doc, "Your weekly rhythm");
    plan.weeklyRhythm.forEach((r) => bullet(doc, r));

    sectionTitle(doc, "Milestones");
    plan.milestones.forEach((m) => {
      ensure(doc, 40);
      const y = doc.y;
      doc.circle(MX + 4, y + 5, 2.4).lineWidth(1.4).strokeColor(EMERALD).stroke();
      doc.y = y;
      doc.font(BOLD).fontSize(8.5).fillColor(EMERALD).text(toWinAnsi(m.when).toUpperCase(), MX + 16, doc.y, { characterSpacing: 0.8, width: CW - 16 });
      rich(doc, m.milestone, MX + 16, CW - 16, { bold: true });
      rich(doc, m.measure, MX + 16, CW - 16, { size: 9.5, color: MUTED });
      doc.moveDown(0.6);
    });

    if (data.jobs.length > 0) {
      sectionTitle(doc, "Opportunities to aim for");
      data.jobs.forEach((job) => {
        ensure(doc, 40);
        const line = [job.company, job.location].filter(Boolean).join(" · ");
        doc.font(BOLD).fontSize(10.5).fillColor(TEXT).text(toWinAnsi(job.title), MX, doc.y, { continued: true, width: CW });
        doc.font(REG).fontSize(9.5).fillColor(MUTED).text(`   ${toWinAnsi(line)}`, { continued: true });
        doc.font(BOLD).fontSize(9.5).fillColor(EMERALD).text(`   ${job.match}% match`);
        rich(doc, job.why, MX, CW, { size: 9.5, color: MUTED });
        doc.moveDown(0.5);
      });
    }

    if (data.careers.length > 0) {
      sectionTitle(doc, "Alternative paths worth keeping open");
      data.careers.forEach((c) => {
        ensure(doc, 34);
        doc.font(BOLD).fontSize(10.5).fillColor(TEXT).text(toWinAnsi(c.title), MX, doc.y, { continued: true, width: CW });
        doc.font(BOLD).fontSize(9.5).fillColor(EMERALD).text(`   ${c.match}% match`);
        rich(doc, c.why, MX, CW, { size: 9.5, color: MUTED });
        doc.moveDown(0.5);
      });
    }

    sectionTitle(doc, "Risks and how to handle them");
    plan.risks.forEach((r) => {
      ensure(doc, 34);
      rich(doc, r.risk, MX, CW, { bold: true });
      labelled(doc, "How to handle it", r.mitigation);
      doc.moveDown(0.3);
    });

    // Footer on every page (margins off so writing near the edge can't add pages).
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const y = PAGE_H - 36;
      doc.moveTo(MX, y - 8).lineTo(PAGE_W - MX, y - 8).lineWidth(0.5).strokeColor(BORDER).stroke();
      doc.font(REG).fontSize(8).fillColor(MUTED);
      const by = data.model ? `Generated by ${data.model} on ${data.generatedOn}` : `Generated by ${APP_NAME} Planner on ${data.generatedOn}`;
      doc.text(`${APP_NAME} · ${toWinAnsi(by)}`, MX, y, { lineBreak: false });
      doc.text(`Page ${i + 1} of ${range.count}`, PAGE_W - MX - 120, y, { width: 120, align: "right", lineBreak: false });
      doc.page.margins.bottom = bottom;
    }

    doc.end();
  });
}
