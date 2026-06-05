/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf';

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
  // Brand
  purple:      [108, 99, 255] as [number, number, number],  // #6c63ff accent
  purpleLight: [139, 131, 255] as [number, number, number], // lighter variant
  purpleSoft:  [230, 228, 255] as [number, number, number], // bg tint

  // Neutral
  dark:        [15,  12,  40] as [number, number, number],  // deep background
  darkCard:    [26,  22,  60] as [number, number, number],  // card bg
  bodyText:    [50,  45,  90] as [number, number, number],  // readable body
  mutedText:   [130, 120, 180] as [number, number, number],
  border:      [210, 207, 240] as [number, number, number],

  // Semantic
  green:       [34, 197, 94] as [number, number, number],
  yellow:      [234, 179, 8] as [number, number, number],
  red:         [239, 68, 68] as [number, number, number],

  white:       [255, 255, 255] as [number, number, number],
  pageGray:    [248, 247, 252] as [number, number, number], // entire page bg
  sectionBg:   [240, 238, 252] as [number, number, number],
};

type RGB = [number, number, number];

interface PDFQuestion {
  _id: string;
  unit: number;
  topic: string;
  questionText: string;
  marks: number;
}

interface PDFSession {
  _id: string;
  evaluationMethod: 'self' | 'photo';
  startedAt: string;
  endedAt?: string;
  testAnalytics?: { tabSwitches: number; focusLosses: number; fullscreenExits: number };
  questions: PDFQuestion[];
  testResponses?: { questionId: string; selfScore?: string; score?: number; notes?: string }[];
  evaluationResult?: {
    totalMarks: number;
    obtainedMarks: number;
    summaryFeedback: string;
    details: { questionId: string; marksAwarded: number; feedback: string }[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setFill(doc: jsPDF, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
}
function setDraw(doc: jsPDF, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2]);
}
function setTextColor(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2]);
}

/** Strip markdown/LaTeX delimiters to plain readable text for PDF rendering */
function stripToPlainText(text: string): string {
  return text
    // ── LaTeX block math: \[ ... \] → keep content, wrap in newlines
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, inner) => '\n' + inner.trim() + '\n')
    // ── LaTeX inline math: \( ... \) → keep content
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_, inner) => inner.trim())
    // ── Display math $$ ... $$ → keep content, wrap in newlines
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => '\n' + inner.trim() + '\n')
    // ── Inline math $ ... $ → keep content
    .replace(/\$([^$\n]+?)\$/g, (_, inner) => inner.trim())
    // ── Code blocks → keep content, mark as code
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, inner) => inner.trim())
    // ── Headings → keep text, remove # prefix
    .replace(/^#{1,6}\s+/gm, '')
    // ── Bold/italic → keep text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/___([^_]+)___/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // ── Links → keep label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // ── Blockquotes
    .replace(/^>\s*/gm, '')
    // ── List bullets
    .replace(/^[-*+]\s+/gm, '• ')
    // ── Numbered lists: keep as-is
    // ── LaTeX common commands: make human-readable
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, 'sum($1 to $2)')
    .replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, 'integral($1 to $2)')
    .replace(/\\left\(/g, '(').replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[').replace(/\\right\]/g, ']')
    .replace(/\\left\{/g, '{').replace(/\\right\}/g, '}')
    .replace(/\\begin\{[^}]+\}/g, '').replace(/\\end\{[^}]+\}/g, '')
    .replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\div/g, '÷')
    .replace(/\\infty/g, '∞').replace(/\\partial/g, '∂').replace(/\\nabla/g, '∇')
    .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ').replace(/\\Delta/g, 'Δ').replace(/\\epsilon/g, 'ε')
    .replace(/\\theta/g, 'θ').replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ')
    .replace(/\\sigma/g, 'σ').replace(/\\Sigma/g, 'Σ').replace(/\\pi/g, 'π')
    .replace(/\\omega/g, 'ω').replace(/\\Omega/g, 'Ω').replace(/\\phi/g, 'φ')
    .replace(/\\psi/g, 'ψ').replace(/\\rho/g, 'ρ').replace(/\\xi/g, 'ξ')
    .replace(/\\eta/g, 'η').replace(/\\tau/g, 'τ').replace(/\\nu/g, 'ν')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈').replace(/\\equiv/g, '≡')
    .replace(/\\pm/g, '±').replace(/\\mp/g, '∓')
    .replace(/\\forall/g, '∀').replace(/\\exists/g, '∃')
    .replace(/\\in/g, '∈').replace(/\\notin/g, '∉')
    .replace(/\\subset/g, '⊂').replace(/\\supset/g, '⊃')
    .replace(/\\cup/g, '∪').replace(/\\cap/g, '∩')
    .replace(/\\rightarrow/g, '→').replace(/\\leftarrow/g, '←')
    .replace(/\\Rightarrow/g, '⇒').replace(/\\Leftarrow/g, '⇐')
    .replace(/\\to/g, '→').replace(/\\gets/g, '←')
    .replace(/\\_\{([^}]*)\}/g, '_$1').replace(/\\\^\{([^}]*)\}/g, '^$1')
    .replace(/\\_([a-zA-Z0-9])/g, '_$1').replace(/\\\^([a-zA-Z0-9])/g, '^$1')
    // ── Clean up remaining backslash commands
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    // ── Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Wrap text to a max width and return lines array */
function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const plain = stripToPlainText(text);
  return doc.splitTextToSize(plain, maxWidth) as string[];
}

/** Draw a rounded rectangle */
function roundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, mode: 'F' | 'S' | 'FD' = 'F') {
  doc.roundedRect(x, y, w, h, r, r, mode);
}

/** Draw a colored badge/chip */
function drawBadge(doc: jsPDF, text: string, x: number, y: number, bgColor: RGB, textColor: RGB, fontSize = 7) {
  doc.setFontSize(fontSize);
  const tw = doc.getTextWidth(text);
  const padX = 4, padY = 2;
  setFill(doc, bgColor);
  setDraw(doc, bgColor);
  roundedRect(doc, x, y - padY - 0.5, tw + padX * 2, fontSize / 2.2 + padY * 2, 2, 'F');
  setTextColor(doc, textColor);
  doc.text(text, x + padX, y + 0.5);
}

/** Draw a horizontal rule */
function drawHR(doc: jsPDF, y: number, x1: number, x2: number, color: RGB = C.border, thickness = 0.3) {
  setDraw(doc, color);
  doc.setLineWidth(thickness);
  doc.line(x1, y, x2, y);
}

/** Circular score donut (filled arc approximated by filled circle outline) */
function drawDonut(doc: jsPDF, cx: number, cy: number, r: number, percentage: number, fgColor: RGB, bgColor: RGB) {
  const segments = 72;
  const filled = Math.round(segments * (percentage / 100));

  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * 2 * Math.PI - Math.PI / 2;
    const angle2 = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
    const color = i < filled ? fgColor : bgColor;
    setFill(doc, color);
    setDraw(doc, color);
    // Draw thin arc segment as a triangle fan
    const x1 = cx + (r - 4) * Math.cos(angle1);
    const y1 = cy + (r - 4) * Math.sin(angle1);
    const x2 = cx + r * Math.cos(angle1);
    const y2 = cy + r * Math.sin(angle1);
    const x3 = cx + (r - 4) * Math.cos(angle2);
    const y3 = cy + (r - 4) * Math.sin(angle2);
    const x4 = cx + r * Math.cos(angle2);
    const y4 = cy + r * Math.sin(angle2);
    // jsPDF triangle
    doc.triangle(x1, y1, x2, y2, x3, y3, 'F');
    doc.triangle(x2, y2, x3, y3, x4, y4, 'F');
  }
}

/** Draw gradient-like header bar using stacked rectangles */
function drawGradientRect(doc: jsPDF, x: number, y: number, w: number, h: number, colorA: RGB, colorB: RGB) {
  const steps = Math.ceil(w);
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const r = Math.round(colorA[0] + t * (colorB[0] - colorA[0]));
    const g = Math.round(colorA[1] + t * (colorB[1] - colorA[1]));
    const b = Math.round(colorA[2] + t * (colorB[2] - colorA[2]));
    doc.setFillColor(r, g, b);
    doc.rect(x + i, y, 1.1, h, 'F');
  }
}

// ─── Main PDF Builder ─────────────────────────────────────────────────────────

export async function generateExamPDF(session: PDFSession, subjectId: string): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const W = 210, H = 297;
  const MARGIN = 16;
  const CONTENT_W = W - MARGIN * 2;

  const { evaluationMethod, questions, testAnalytics, evaluationResult } = session;

  const totalMarks = evaluationResult?.totalMarks || questions.reduce((s, q) => s + (q.marks || 10), 0);
  const obtainedMarks = evaluationResult?.obtainedMarks ?? 0;
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

  const totalBreaches = (testAnalytics?.tabSwitches || 0) + (testAnalytics?.focusLosses || 0) + (testAnalytics?.fullscreenExits || 0);
  const trustScore = Math.max(0, 100 - totalBreaches * 15);

  const timeSpentSeconds = session.endedAt && session.startedAt
    ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
    : 0;
  const mins = Math.floor(timeSpentSeconds / 60);
  const secs = timeSpentSeconds % 60;
  const formattedTime = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const attemptedCount = evaluationMethod === 'self'
    ? (session.testResponses?.filter(r => r.selfScore !== undefined).length || 0)
    : questions.length;

  const responseMap = session.testResponses?.reduce((acc, resp) => {
    acc[resp.questionId] = resp;
    return acc;
  }, {} as Record<string, any>) || {};

  const aiDetailsMap = evaluationResult?.details?.reduce((acc, d) => {
    acc[d.questionId] = d;
    return acc;
  }, {} as Record<string, any>) || {};

  // ── PAGE 1: Cover ──────────────────────────────────────────────────────────

  // Page background
  setFill(doc, C.pageGray);
  doc.rect(0, 0, W, H, 'F');

  // Top gradient header bar
  drawGradientRect(doc, 0, 0, W, 52, [80, 70, 220], [130, 60, 240]);

  // PaperHub logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  setTextColor(doc, C.white);
  doc.text('PaperHub', MARGIN, 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, [210, 205, 255]);
  doc.text('Academic Examination Suite', MARGIN, 29);

  // "OFFICIAL TRANSCRIPT" badge top right
  drawBadge(doc, 'OFFICIAL TRANSCRIPT', W - MARGIN - 50, 21, [255, 255, 255, 0.2] as any, C.white, 7);

  // Date top right
  doc.setFontSize(7);
  setTextColor(doc, [210, 205, 255]);
  doc.text(new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), W - MARGIN, 30, { align: 'right' });

  // ── Score hero card ────────────────────────────────────────────────────────
  const heroY = 62;
  setFill(doc, C.white);
  setDraw(doc, C.border);
  roundedRect(doc, MARGIN, heroY, CONTENT_W, 78, 6, 'F');

  // Subtle accent strip on left of card
  setFill(doc, C.purple);
  doc.roundedRect(MARGIN, heroY, 4, 78, 2, 2, 'F');

  // Donut in card center-left
  const donutCX = MARGIN + 34;
  const donutCY = heroY + 39;
  const donutR = 24;

  drawDonut(doc, donutCX, donutCY, donutR, percentage, C.purple, C.purpleSoft);

  // Percentage text center of donut
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setTextColor(doc, C.purple);
  doc.text(`${percentage}%`, donutCX, donutCY + 2, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.mutedText);
  doc.text('Score', donutCX, donutCY + 7, { align: 'center' });

  // Marks text to the right of donut
  const infoX = MARGIN + 66;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  setTextColor(doc, C.dark);
  doc.text(`${obtainedMarks}`, infoX, heroY + 28);
  doc.setFontSize(11);
  setTextColor(doc, C.mutedText);
  doc.text(`/ ${totalMarks} Marks`, infoX + doc.getTextWidth(`${obtainedMarks}`) + 2, heroY + 28);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.bodyText);
  doc.text('Exam Grade & Performance Report', infoX, heroY + 37);

  // Evaluation method badge
  const evalLabel = evaluationMethod === 'photo' ? '🤖 AI Vision Grader' : '📝 Self Assessment';
  doc.setFontSize(7);
  setTextColor(doc, C.purple);
  setFill(doc, C.purpleSoft);
  setDraw(doc, C.purpleLight);
  const evalW = doc.getTextWidth(evalLabel) + 8;
  doc.roundedRect(infoX, heroY + 41, evalW, 7, 2, 2, 'FD');
  setTextColor(doc, C.purple);
  doc.text(evalLabel, infoX + 4, heroY + 46);

  // ── 4 Mini stat boxes below hero ──────────────────────────────────────────
  const statsY = heroY + 88;
  const statW = (CONTENT_W - 9) / 4;
  const stats = [
    { label: 'Time Spent', value: formattedTime, icon: '⏱' },
    { label: 'Questions', value: `${attemptedCount}/${questions.length}`, icon: '📄' },
    { label: 'Trust Score', value: `${trustScore}%`, icon: '🛡', color: trustScore >= 75 ? C.green : C.red },
    { label: 'Session ID', value: session._id.slice(-8).toUpperCase(), icon: '🔖' },
  ];

  stats.forEach((stat, i) => {
    const sx = MARGIN + i * (statW + 3);
    setFill(doc, C.white);
    setDraw(doc, C.border);
    doc.setLineWidth(0.3);
    roundedRect(doc, sx, statsY, statW, 24, 4, 'FD');

    // Accent top stripe
    setFill(doc, stat.color || C.purple);
    doc.roundedRect(sx, statsY, statW, 2.5, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setTextColor(doc, stat.color || C.dark);
    doc.text(stat.value, sx + statW / 2, statsY + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    setTextColor(doc, C.mutedText);
    doc.text(stat.label.toUpperCase(), sx + statW / 2, statsY + 19, { align: 'center' });
  });

  // ── Session Metadata Table ─────────────────────────────────────────────────
  const metaY = statsY + 32;
  setFill(doc, C.white);
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  roundedRect(doc, MARGIN, metaY, CONTENT_W, 38, 4, 'FD');

  // Section header
  setFill(doc, C.sectionBg);
  roundedRect(doc, MARGIN, metaY, CONTENT_W, 10, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setTextColor(doc, C.purple);
  doc.text('SESSION DETAILS', MARGIN + 6, metaY + 6.5);

  const metaRows = [
    ['Session ID', session._id],
    ['Subject Code', subjectId],
    ['Evaluation Model', evaluationMethod === 'photo' ? 'Llama 4 Maverick Vision OCR Grader' : 'Self Assessment'],
    ['Date & Time', session.endedAt ? new Date(session.endedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')],
  ];

  const colW = CONTENT_W / 2 - 6;
  metaRows.forEach((row, i) => {
    const rowY = metaY + 13 + i * 6;
    const isLeft = i < 2;
    const mx = isLeft ? MARGIN + 4 : MARGIN + CONTENT_W / 2 + 4;
    const myRow = isLeft ? rowY : metaY + 13 + (i - 2) * 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setTextColor(doc, C.mutedText);
    doc.text(row[0] + ':', mx, myRow);

    doc.setFont('helvetica', 'normal');
    setTextColor(doc, C.bodyText);
    doc.text(doc.splitTextToSize(row[1], colW)[0], mx + doc.getTextWidth(row[0] + ': '), myRow);
  });

  // ── Examiner Feedback ─────────────────────────────────────────────────────
  if (evaluationResult?.summaryFeedback) {
    const fbY = metaY + 46;
    setFill(doc, C.purpleSoft);
    setDraw(doc, C.purpleLight);
    doc.setLineWidth(0.3);
    const fbLines = doc.splitTextToSize(evaluationResult.summaryFeedback, CONTENT_W - 16) as string[];
    const fbH = Math.min(fbLines.length * 4.5 + 16, 55);
    roundedRect(doc, MARGIN, fbY, CONTENT_W, fbH, 4, 'FD');

    // Left accent bar
    setFill(doc, C.purple);
    doc.rect(MARGIN, fbY, 3, fbH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTextColor(doc, C.purple);
    doc.text('AI EXAMINER FEEDBACK', MARGIN + 7, fbY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(doc, C.bodyText);
    doc.text(fbLines.slice(0, Math.floor((fbH - 14) / 4.5)), MARGIN + 7, fbY + 13);
  }

  // ── Integrity Guard ────────────────────────────────────────────────────────
  const intY = (evaluationResult?.summaryFeedback ? metaY + 46 + 60 : metaY + 46);
  const intColor = trustScore >= 75 ? C.green : C.red;
  const intBg: RGB = trustScore >= 75 ? [220, 252, 231] : [254, 226, 226];
  setFill(doc, intBg);
  setDraw(doc, intColor);
  doc.setLineWidth(0.4);
  roundedRect(doc, MARGIN, Math.min(intY, H - 40), CONTENT_W, 20, 4, 'FD');
  setFill(doc, intColor);
  doc.rect(MARGIN, Math.min(intY, H - 40), 3, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setTextColor(doc, intColor);
  doc.text(
    trustScore >= 90 ? '✓ INTEGRITY VERIFIED — Excellent exam conduct' :
    trustScore >= 75 ? '⚠ INTEGRITY MODERATE — Minor breaches detected' :
    '✗ INTEGRITY COMPROMISED — Multiple violations recorded',
    MARGIN + 7, Math.min(intY, H - 40) + 8
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setTextColor(doc, C.bodyText);
  doc.text(
    `Tab switches: ${testAnalytics?.tabSwitches || 0} · Focus losses: ${testAnalytics?.focusLosses || 0} · Fullscreen exits: ${testAnalytics?.fullscreenExits || 0} · Total breaches: ${totalBreaches}`,
    MARGIN + 7, Math.min(intY, H - 40) + 14
  );

  // ── Page footer ────────────────────────────────────────────────────────────
  drawGradientRect(doc, 0, H - 14, W, 14, [80, 70, 220], [130, 60, 240]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setTextColor(doc, [210, 205, 255]);
  doc.text('PaperHub Academic Evaluation Suite  •  Confidential Exam Report', MARGIN, H - 5);
  doc.text('Page 1', W - MARGIN, H - 5, { align: 'right' });

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PAGES 2+: Question Breakdown ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    doc.addPage();

    // Page background
    setFill(doc, C.pageGray);
    doc.rect(0, 0, W, H, 'F');

    // Top mini-header
    drawGradientRect(doc, 0, 0, W, 16, [80, 70, 220], [130, 60, 240]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, C.white);
    doc.text('PaperHub', MARGIN, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setTextColor(doc, [210, 205, 255]);
    doc.text('Granular Solution Breakdown', MARGIN + 22, 10);

    doc.setFontSize(7);
    setTextColor(doc, [210, 205, 255]);
    doc.text(`Q${qi + 1} of ${questions.length}`, W - MARGIN, 10, { align: 'right' });

    // Question card
    const qCardY = 22;
    const isSelf = evaluationMethod === 'self';
    const selfResp = responseMap[q._id];
    const aiDetail = aiDetailsMap[q._id];
    const score = isSelf ? (selfResp?.score || 0) : (aiDetail?.marksAwarded || 0);
    const feedback = isSelf
      ? `Self-graded as: ${selfResp?.selfScore || 'Not graded'}.${selfResp?.notes ? '\n\nNotes: ' + selfResp.notes : ''}`
      : (aiDetail?.feedback || 'No feedback available.');

    const selfScoreColor: RGB =
      selfResp?.selfScore === 'correct' ? C.green :
      selfResp?.selfScore === 'partial' ? C.yellow : C.red;

    const markPct = q.marks > 0 ? score / q.marks : 0;
    const markColor: RGB = markPct >= 0.7 ? C.green : markPct >= 0.4 ? C.yellow : C.red;

    // Question header strip
    setFill(doc, C.white);
    setDraw(doc, C.border);
    doc.setLineWidth(0.3);
    roundedRect(doc, MARGIN, qCardY, CONTENT_W, 18, 4, 'FD');
    setFill(doc, C.purple);
    doc.roundedRect(MARGIN, qCardY, 4, 18, 2, 2, 'F');

    // Question number chip
    setFill(doc, C.purple);
    doc.circle(MARGIN + 12, qCardY + 9, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, C.white);
    doc.text(`${qi + 1}`, MARGIN + 12, qCardY + 11.5, { align: 'center' });

    // Topic + unit
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setTextColor(doc, C.dark);
    doc.text(q.topic || 'Topic', MARGIN + 22, qCardY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setTextColor(doc, C.mutedText);
    doc.text(`Unit ${q.unit}`, MARGIN + 22, qCardY + 13);

    // Score badge on right
    const scoreStr = `${score} / ${q.marks || 10} Marks`;
    setFill(doc, markColor);
    const sw = doc.getTextWidth(scoreStr) + 8;
    doc.roundedRect(MARGIN + CONTENT_W - sw - 2, qCardY + 5, sw, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, C.white);
    doc.text(scoreStr, MARGIN + CONTENT_W - sw + 2, qCardY + 10.5);

    // Self score badge
    if (isSelf && selfResp?.selfScore) {
      const ssLabel = selfResp.selfScore.toUpperCase();
      drawBadge(doc, ssLabel, MARGIN + CONTENT_W - sw - doc.getTextWidth(ssLabel) - 16, qCardY + 7.5, selfScoreColor, C.white, 6.5);
    }

    // Question text section
    const qtY = qCardY + 22;
    setFill(doc, C.white);
    setDraw(doc, C.border);
    doc.setLineWidth(0.3);

    const qtLines = wrapText(doc, q.questionText, CONTENT_W - 12);
    const qtH = Math.min(qtLines.length * 5 + 14, 120);
    roundedRect(doc, MARGIN, qtY, CONTENT_W, qtH, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTextColor(doc, C.purple);
    doc.text('QUESTION', MARGIN + 6, qtY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(doc, C.bodyText);
    const maxQLines = Math.floor((qtH - 14) / 5);
    doc.text(qtLines.slice(0, maxQLines), MARGIN + 6, qtY + 13);

    if (qtLines.length > maxQLines) {
      doc.setFontSize(6.5);
      setTextColor(doc, C.mutedText);
      doc.text('[Question truncated — see full text on PaperHub]', MARGIN + 6, qtY + qtH - 4);
    }

    // Feedback section
    const fbY2 = qtY + qtH + 6;
    const fbLines2 = doc.splitTextToSize(feedback, CONTENT_W - 16) as string[];
    const fbH2 = Math.min(fbLines2.length * 4.5 + 18, H - fbY2 - 20);
    setFill(doc, C.purpleSoft);
    setDraw(doc, C.purpleLight);
    doc.setLineWidth(0.3);
    roundedRect(doc, MARGIN, fbY2, CONTENT_W, fbH2, 4, 'FD');

    // Left colored strip based on grade
    setFill(doc, markColor);
    doc.roundedRect(MARGIN, fbY2, 3.5, fbH2, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTextColor(doc, C.purple);
    doc.text(evaluationMethod === 'photo' ? 'AI EXAMINER EVALUATION' : 'SELF-GRADING NOTES', MARGIN + 8, fbY2 + 8);

    // Mark/grade indicator
    const gradeText = markPct >= 0.7 ? 'GOOD' : markPct >= 0.4 ? 'PARTIAL' : 'NEEDS IMPROVEMENT';
    drawBadge(doc, gradeText, MARGIN + CONTENT_W - doc.getTextWidth(gradeText) - 14, fbY2 + 4, markColor, C.white, 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(doc, C.bodyText);
    const maxFbLines = Math.floor((fbH2 - 16) / 4.5);
    doc.text(fbLines2.slice(0, maxFbLines), MARGIN + 8, fbY2 + 14);

    // Mini progress bar for this question
    const pbY = fbY2 + fbH2 + 6;
    if (pbY < H - 24) {
      setFill(doc, C.border);
      roundedRect(doc, MARGIN, pbY, CONTENT_W, 6, 3, 'F');
      setFill(doc, markColor);
      roundedRect(doc, MARGIN, pbY, Math.max(CONTENT_W * markPct, 4), 6, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      setTextColor(doc, C.mutedText);
      doc.text(`Score: ${score}/${q.marks || 10} (${Math.round(markPct * 100)}%)`, MARGIN, pbY + 12);
    }

    // Page footer
    drawGradientRect(doc, 0, H - 14, W, 14, [80, 70, 220], [130, 60, 240]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setTextColor(doc, [210, 205, 255]);
    doc.text('PaperHub Academic Evaluation Suite  •  Confidential Exam Report', MARGIN, H - 5);
    doc.text(`Page ${qi + 2}`, W - MARGIN, H - 5, { align: 'right' });
  }

  // ─── Final summary page ────────────────────────────────────────────────────
  doc.addPage();
  setFill(doc, C.pageGray);
  doc.rect(0, 0, W, H, 'F');

  drawGradientRect(doc, 0, 0, W, 16, [80, 70, 220], [130, 60, 240]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setTextColor(doc, C.white);
  doc.text('PaperHub — Performance Summary', MARGIN, 10);
  doc.setFontSize(7);
  setTextColor(doc, [210, 205, 255]);
  doc.text(`Page ${questions.length + 2}`, W - MARGIN, 10, { align: 'right' });

  // Score breakdown table
  let rowY2 = 26;
  setFill(doc, C.white);
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  roundedRect(doc, MARGIN, rowY2, CONTENT_W, 14 + questions.length * 8 + 10, 4, 'FD');

  setFill(doc, C.purple);
  roundedRect(doc, MARGIN, rowY2, CONTENT_W, 10, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setTextColor(doc, C.white);
  const cols = ['#', 'Topic', 'Unit', 'Max', 'Scored', '%'];
  const colXs = [MARGIN + 5, MARGIN + 16, MARGIN + 80, MARGIN + 108, MARGIN + 128, MARGIN + 150];
  cols.forEach((c, i) => doc.text(c, colXs[i], rowY2 + 7));

  rowY2 += 12;
  questions.forEach((q, i) => {
    const isSelf = evaluationMethod === 'self';
    const score2 = isSelf ? (responseMap[q._id]?.score || 0) : (aiDetailsMap[q._id]?.marksAwarded || 0);
    const pct2 = q.marks > 0 ? Math.round((score2 / q.marks) * 100) : 0;
    const rowColor: RGB = pct2 >= 70 ? [220, 252, 231] : pct2 >= 40 ? [254, 249, 195] : [254, 226, 226];
    const textColor: RGB = pct2 >= 70 ? C.green : pct2 >= 40 ? C.yellow : C.red;

    if (i % 2 === 0) {
      setFill(doc, [248, 247, 252]);
      doc.rect(MARGIN, rowY2 - 2, CONTENT_W, 8, 'F');
    }

    setFill(doc, rowColor);
    doc.roundedRect(MARGIN + 145, rowY2 - 1.5, 30, 5.5, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTextColor(doc, C.mutedText);
    doc.text(`${i + 1}`, colXs[0], rowY2 + 3);

    doc.setFont('helvetica', 'normal');
    setTextColor(doc, C.bodyText);
    doc.text(doc.splitTextToSize(q.topic || 'Q' + (i + 1), 58)[0], colXs[1], rowY2 + 3);
    doc.text(`${q.unit}`, colXs[2], rowY2 + 3);
    doc.text(`${q.marks || 10}`, colXs[3], rowY2 + 3);
    doc.text(`${score2}`, colXs[4], rowY2 + 3);

    doc.setFont('helvetica', 'bold');
    setTextColor(doc, textColor);
    doc.text(`${pct2}%`, colXs[5] + 5, rowY2 + 3);

    rowY2 += 8;
  });

  // Totals row
  drawHR(doc, rowY2 + 1, MARGIN + 4, MARGIN + CONTENT_W - 4, C.border);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setTextColor(doc, C.dark);
  doc.text('TOTAL', colXs[1], rowY2 + 8);
  doc.text(`${totalMarks}`, colXs[3], rowY2 + 8);
  setTextColor(doc, C.purple);
  doc.text(`${obtainedMarks}`, colXs[4], rowY2 + 8);
  doc.text(`${percentage}%`, colXs[5] + 5, rowY2 + 8);

  // Footer congratulatory message
  const cY = rowY2 + 30;
  if (cY < H - 30) {
    setFill(doc, C.white);
    setDraw(doc, C.border);
    doc.setLineWidth(0.3);
    roundedRect(doc, MARGIN, cY, CONTENT_W, 36, 4, 'FD');
    setFill(doc, C.purple);
    doc.roundedRect(MARGIN, cY, 4, 36, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setTextColor(doc, C.dark);
    doc.text(
      percentage >= 75 ? '🎉 Outstanding Performance!' :
      percentage >= 50 ? '👍 Good Effort — Keep Improving' :
      '📚 Keep Practicing — You\'ve Got This!',
      MARGIN + 10, cY + 12
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(doc, C.bodyText);
    const encMsg = `You scored ${obtainedMarks} out of ${totalMarks} marks (${percentage}%) with a trust score of ${trustScore}%. Continue practicing on PaperHub to sharpen your exam performance.`;
    doc.text(doc.splitTextToSize(encMsg, CONTENT_W - 16) as string[], MARGIN + 10, cY + 20);
  }

  // Final footer
  drawGradientRect(doc, 0, H - 14, W, 14, [80, 70, 220], [130, 60, 240]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setTextColor(doc, [210, 205, 255]);
  doc.text('PaperHub Academic Evaluation Suite  •  Confidential Exam Report  •  paperhub.in', MARGIN, H - 5);
  doc.text(`Page ${questions.length + 2}`, W - MARGIN, H - 5, { align: 'right' });

  // ── Save ───────────────────────────────────────────────────────────────────
  const filename = `PaperHub_ExamReport_${session._id.slice(-8).toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export async function generateTestPaperPDF(
  session: PDFSession,
  subjectName: string,
  subjectCode: string,
  examType: string,
  durationMin: number
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210, H = 297;
  const MARGIN = 20;
  const CONTENT_W = W - MARGIN * 2;

  let y = 25;

  // 1. Header (Centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PAPERHUB MOCK EXAMINATION', W / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AFFILIATED ACADEMIC SIMULATION SERVICE', W / 2, y, { align: 'center' });
  y += 12;

  // Draw double border line for header
  setDraw(doc, [0, 0, 0]);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, W - MARGIN, y);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 1.2, W - MARGIN, y + 1.2);
  y += 8;

  // 2. Exam Info Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`SUBJECT: ${subjectName.toUpperCase()}`, MARGIN, y);
  doc.text(`CODE: ${subjectCode.toUpperCase()}`, W - MARGIN, y, { align: 'right' });
  y += 6;

  const totalMarks = session.questions.reduce((sum, q) => sum + (q.marks || 10), 0);
  doc.text(`DURATION: ${durationMin} MINUTES`, MARGIN, y);
  doc.text(`MAXIMUM MARKS: ${totalMarks}`, W - MARGIN, y, { align: 'right' });
  y += 6;

  doc.text(`EXAM TYPE: ${examType.toUpperCase()} SIMULATION`, MARGIN, y);
  y += 8;

  // Border below info
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 8;

  // 3. Instructions Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('GENERAL INSTRUCTIONS:', MARGIN, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const instructions = [
    '1. All questions are descriptive. Answer all parts in detail.',
    '2. Write your answers clearly on physical sheets with correct question numbering.',
    '3. Do not open other tabs or minimize the browser window during the active session.',
    '4. Verify and upload photos/notes of your script before the AUTHORITATIVE timer expires.'
  ];

  instructions.forEach((inst) => {
    const instLines = doc.splitTextToSize(inst, CONTENT_W) as string[];
    instLines.forEach((line) => {
      doc.text(line, MARGIN, y);
      y += 5;
    });
  });
  y += 4;

  // Border below instructions
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 10;

  // 4. Questions Listing
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SECTION A: DESCRIPTIVE QUESTIONS', MARGIN, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  for (let i = 0; i < session.questions.length; i++) {
    const q = session.questions[i];
    const qLabel = `Q${i + 1}. [Unit ${q.unit}] (Marks: ${q.marks || 10})`;
    
    // Check page overflow before writing question header
    if (y > H - MARGIN - 30) {
      doc.addPage();
      y = 25;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SECTION A (CONTINUED)', MARGIN, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }

    doc.setFont('helvetica', 'bold');
    doc.text(qLabel, MARGIN, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    const qTextLines = wrapText(doc, q.questionText, CONTENT_W - 8);
    
    for (let j = 0; j < qTextLines.length; j++) {
      if (y > H - MARGIN - 15) {
        doc.addPage();
        y = 25;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      }
      doc.text(qTextLines[j], MARGIN + 4, y);
      y += 5.5;
    }
    y += 6; // Spacing between questions
  }

  // Footer text
  doc.setLineWidth(0.2);
  doc.line(MARGIN, H - 25, W - MARGIN, H - 25);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('--- END OF QUESTION PAPER ---', W / 2, H - 20, { align: 'center' });
  doc.text('Generated by PaperHub Examination Suite', W / 2, H - 15, { align: 'center' });

  const filename = `PaperHub_QuestionPaper_${subjectCode.toUpperCase()}_${examType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
