import { mkdirSync, copyFileSync } from "node:fs";
import PptxGenJS from "pptxgenjs";
import { DECK } from "../src/lib/brief/deck.ts";

const C = {
  bg: "090A0B",
  surface: "111315",
  elevated: "181B1E",
  fg: "ECEEF0",
  muted: "8C9399",
  subtle: "6A7178",
  accent: "7EA2B3",
  ok: "7FA88A",
  warn: "C4A35A",
  danger: "C45C4A",
  border: "2A2E32",
};

const LIGHT = { green: C.ok, yellow: C.warn, red: C.danger };

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.title = "InfraCop MCP — Tech leadership briefing";
pptx.author = "InfraCop";
pptx.subject = "Enterprise Terraform standards via MCP";

function base(slide) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0,
    y: 7.28,
    w: 13.333,
    h: 0.04,
    fill: { color: C.accent },
  });
  slide.addText("InfraCop MCP  ·  confidential  ·  tech leadership", {
    x: 0.6,
    y: 7.12,
    w: 9,
    h: 0.22,
    fontFace: "Arial",
    fontSize: 10,
    color: C.subtle,
    margin: 0,
  });
}

function kicker(slide, text) {
  slide.addText(text.toUpperCase(), {
    x: 0.6,
    y: 0.38,
    w: 12,
    h: 0.28,
    fontFace: "Arial",
    fontSize: 11,
    color: C.accent,
    charSpacing: 3,
    margin: 0,
  });
}

function heading(slide, text, y = 0.68) {
  slide.addText(text, {
    x: 0.6,
    y,
    w: 12.1,
    h: 0.7,
    fontFace: "Arial",
    fontSize: 28,
    color: C.fg,
    bold: true,
    margin: 0,
  });
}

for (const s of DECK.slides) {
  const slide = pptx.addSlide();
  base(slide);

  if (s.layout === "title") {
    kicker(slide, s.kicker);
    slide.addText(s.title, {
      x: 0.6,
      y: 1.6,
      w: 11.8,
      h: 1.8,
      fontFace: "Arial",
      fontSize: 40,
      color: C.fg,
      bold: true,
      margin: 0,
    });
    slide.addText(s.subtitle, {
      x: 0.6,
      y: 3.6,
      w: 10.4,
      h: 1.4,
      fontFace: "Arial",
      fontSize: 16,
      color: C.muted,
      margin: 0,
    });
    slide.addText(s.meta, {
      x: 0.6,
      y: 5.4,
      w: 10,
      h: 0.3,
      fontFace: "Arial",
      fontSize: 12,
      color: C.subtle,
      margin: 0,
    });
    continue;
  }

  kicker(slide, s.kicker);
  if (s.layout !== "diagram") heading(slide, s.title);

  if (s.layout === "agenda") {
    s.items.forEach((item, i) => {
      const y = 1.6 + i * 1.05;
      slide.addText(item.n, {
        x: 0.6,
        y,
        w: 0.8,
        h: 0.4,
        fontFace: "Arial",
        fontSize: 16,
        color: C.accent,
        margin: 0,
      });
      slide.addText(item.label, {
        x: 1.5,
        y,
        w: 10.8,
        h: 0.5,
        fontFace: "Arial",
        fontSize: 20,
        color: C.fg,
        margin: 0,
      });
    });
  }

  if (s.layout === "cards") {
    if (s.lede) {
      slide.addText(s.lede, {
        x: 0.6,
        y: 1.4,
        w: 12.1,
        h: 0.7,
        fontFace: "Arial",
        fontSize: 13,
        color: C.muted,
        margin: 0,
      });
    }
    const top = s.lede ? 2.2 : 1.55;
    s.cards.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.6 + col * 6.2;
      const y = top + row * 2.2;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x,
        y,
        w: 5.9,
        h: 2.0,
        fill: { color: C.elevated },
        rectRadius: 0.08,
      });
      slide.addText(c.title, {
        x: x + 0.25,
        y: y + 0.2,
        w: 5.4,
        h: 0.35,
        fontFace: "Arial",
        fontSize: 15,
        color: C.fg,
        bold: true,
        margin: 0,
      });
      slide.addText(c.copy, {
        x: x + 0.25,
        y: y + 0.6,
        w: 5.4,
        h: 1.2,
        fontFace: "Arial",
        fontSize: 12,
        color: C.muted,
        margin: 0,
      });
    });
  }

  if (s.layout === "quote") {
    s.examples.forEach((ex, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.6 + col * 6.2;
      const y = 1.55 + row * 2.15;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x,
        y,
        w: 5.9,
        h: 1.95,
        fill: { color: C.elevated },
        rectRadius: 0.08,
      });
      slide.addText(ex.bad, {
        x: x + 0.25,
        y: y + 0.25,
        w: 5.4,
        h: 0.4,
        fontFace: "Consolas",
        fontSize: 18,
        color: C.danger,
        margin: 0,
      });
      slide.addText(ex.why, {
        x: x + 0.25,
        y: y + 0.8,
        w: 5.4,
        h: 0.8,
        fontFace: "Arial",
        fontSize: 13,
        color: C.muted,
        margin: 0,
      });
    });
    slide.addText(s.note, {
      x: 0.6,
      y: 5.9,
      w: 12.1,
      h: 0.85,
      fontFace: "Arial",
      fontSize: 12,
      color: C.muted,
      margin: 0,
    });
  }

  if (s.layout === "split") {
    const cols = [
      { title: s.leftTitle, items: s.left, x: 0.6, color: C.warn },
      { title: s.rightTitle, items: s.right, x: 6.8, color: C.ok },
    ];
    for (const col of cols) {
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: col.x,
        y: 1.55,
        w: 5.95,
        h: 5.2,
        fill: { color: C.elevated },
        rectRadius: 0.08,
      });
      slide.addText(col.title, {
        x: col.x + 0.3,
        y: 1.75,
        w: 5.35,
        h: 0.4,
        fontFace: "Arial",
        fontSize: 14,
        color: col.color,
        bold: true,
        margin: 0,
      });
      slide.addText(col.items.map((t) => ({ text: t, options: { bullet: false } })), {
        x: col.x + 0.3,
        y: 2.3,
        w: 5.35,
        h: 4.1,
        fontFace: "Arial",
        fontSize: 13,
        color: C.muted,
        paraSpaceAfter: 10,
      });
    }
  }

  if (s.layout === "flow") {
    s.steps.forEach((step, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.6 + col * 6.2;
      const y = 1.55 + row * 2.4;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x,
        y,
        w: 5.9,
        h: 2.2,
        fill: { color: C.elevated },
        rectRadius: 0.08,
      });
      slide.addText(step.n, {
        x: x + 0.25,
        y: y + 0.2,
        w: 1,
        h: 0.3,
        fontFace: "Arial",
        fontSize: 12,
        color: C.accent,
        margin: 0,
      });
      slide.addText(step.title, {
        x: x + 0.25,
        y: y + 0.55,
        w: 5.4,
        h: 0.35,
        fontFace: "Arial",
        fontSize: 16,
        color: C.fg,
        bold: true,
        margin: 0,
      });
      slide.addText(step.copy, {
        x: x + 0.25,
        y: y + 1.0,
        w: 5.4,
        h: 0.95,
        fontFace: "Arial",
        fontSize: 13,
        color: C.muted,
        margin: 0,
      });
    });
  }

  if (s.layout === "lights") {
    slide.addText(s.lede, {
      x: 0.6,
      y: 1.4,
      w: 12.1,
      h: 0.7,
      fontFace: "Arial",
      fontSize: 13,
      color: C.muted,
      margin: 0,
    });
    s.bands.forEach((b, i) => {
      const x = 0.6 + i * 4.15;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x,
        y: 2.25,
        w: 3.95,
        h: 3.3,
        fill: { color: C.elevated },
        rectRadius: 0.08,
      });
      slide.addShape(pptx.shapes.OVAL, {
        x: x + 0.3,
        y: 2.5,
        w: 0.28,
        h: 0.28,
        fill: { color: LIGHT[b.light] },
      });
      slide.addText(b.light.toUpperCase(), {
        x: x + 0.7,
        y: 2.48,
        w: 2.8,
        h: 0.32,
        fontFace: "Arial",
        fontSize: 14,
        color: LIGHT[b.light],
        bold: true,
        margin: 0,
      });
      slide.addText(b.range, {
        x: x + 0.3,
        y: 3.05,
        w: 3.35,
        h: 0.5,
        fontFace: "Arial",
        fontSize: 22,
        color: C.fg,
        margin: 0,
      });
      slide.addText(b.meaning, {
        x: x + 0.3,
        y: 3.7,
        w: 3.35,
        h: 1.5,
        fontFace: "Arial",
        fontSize: 13,
        color: C.muted,
        margin: 0,
      });
    });
    slide.addText(s.footnote, {
      x: 0.6,
      y: 5.75,
      w: 12.1,
      h: 1.0,
      fontFace: "Arial",
      fontSize: 11,
      color: C.subtle,
      margin: 0,
    });
  }

  if (s.layout === "scorecard") {
    const headers = ["Project", "Account", "Score", "Light", "Gap"];
    const rows = s.rows.map((r) => [
      r.project,
      r.account,
      `${r.percent}%`,
      r.light.toUpperCase(),
      r.gap,
    ]);
    slide.addTable([headers, ...rows], {
      x: 0.6,
      y: 1.55,
      w: 12.1,
      colW: [2.0, 2.2, 1.2, 1.4, 5.3],
      border: [{ pt: 0 }, { pt: 0.5, color: C.border }, { pt: 0 }, { pt: 0 }],
      fontFace: "Arial",
      fontSize: 12,
      color: C.fg,
      align: "left",
      valign: "middle",
      fontBold: false,
      fill: { color: C.bg },
      rowH: 0.7,
    });
  }

  if (s.layout === "table") {
    const tableRows = [
      s.headers.map((h) => ({
        text: h,
        options: { bold: true, color: C.muted, fontSize: 11 },
      })),
      ...s.rows.map((row) =>
        row.map((cell, idx) => ({
          text: cell,
          options: { color: idx === 1 ? C.fg : C.muted, fontSize: 12 },
        })),
      ),
    ];
    slide.addTable(tableRows, {
      x: 0.6,
      y: 1.5,
      w: 12.1,
      colW: [5.7, 6.4],
      border: [{ pt: 0 }, { pt: 0.5, color: C.border }, { pt: 0 }, { pt: 0 }],
      fontFace: "Arial",
      fill: { color: C.bg },
      valign: "top",
      rowH: 0.78,
    });
  }

  if (s.layout === "ask") {
    s.items.forEach((item, i) => {
      const y = 1.55 + i * 0.95;
      slide.addText(String(i + 1).padStart(2, "0"), {
        x: 0.6,
        y,
        w: 0.7,
        h: 0.35,
        fontFace: "Arial",
        fontSize: 14,
        color: C.accent,
        margin: 0,
      });
      slide.addText(item, {
        x: 1.4,
        y,
        w: 11.2,
        h: 0.8,
        fontFace: "Arial",
        fontSize: 15,
        color: C.muted,
        margin: 0,
      });
    });
    slide.addText(s.close, {
      x: 0.6,
      y: 5.7,
      w: 12.1,
      h: 0.7,
      fontFace: "Arial",
      fontSize: 18,
      color: C.fg,
      bold: true,
      margin: 0,
    });
  }

  if (s.layout === "diagram") {
    heading(slide, s.title, 0.62);
    slide.addText(s.lede, {
      x: 0.6,
      y: 1.22,
      w: 12.1,
      h: 0.4,
      fontFace: "Arial",
      fontSize: 12,
      color: C.muted,
      margin: 0,
    });
    s.lanes.forEach((lane, li) => {
      const y = 1.68 + li * 1.3;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: 0.5,
        y,
        w: 12.3,
        h: 1.22,
        fill: { color: C.elevated },
        rectRadius: 0.06,
      });
      slide.addText(`${lane.n}  ${lane.label.toUpperCase()}`, {
        x: 0.65,
        y: y + 0.06,
        w: 12,
        h: 0.22,
        fontFace: "Arial",
        fontSize: 10,
        color: C.accent,
        margin: 0,
      });
      lane.nodes.forEach((node, ni) => {
        const x = 0.65 + ni * 4.05;
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x,
          y: y + 0.3,
          w: 3.9,
          h: 0.82,
          fill: { color: C.surface },
          rectRadius: 0.04,
        });
        slide.addText(node.title, {
          x: x + 0.12,
          y: y + 0.34,
          w: 3.66,
          h: 0.22,
          fontFace: "Arial",
          fontSize: 12,
          color: C.fg,
          bold: true,
          margin: 0,
        });
        slide.addText(node.copy, {
          x: x + 0.12,
          y: y + 0.56,
          w: 3.66,
          h: 0.5,
          fontFace: "Arial",
          fontSize: 10,
          color: C.muted,
          margin: 0,
        });
      });
    });
  }
}

mkdirSync("/workspace/public", { recursive: true });
mkdirSync("/workspace/artifacts", { recursive: true });
const dest = "/workspace/public/infracop-leadership-brief.pptx";
await pptx.writeFile({ fileName: dest });
copyFileSync(dest, "/workspace/artifacts/infracop-leadership-brief.pptx");
console.log("wrote", dest);
