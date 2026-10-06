// Gera o manual em PPTX a partir de roteiro.json e da pasta prints/.
// Uso: node build_pptx.js [saida.pptx]
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");

const DIR = __dirname;
const R = JSON.parse(fs.readFileSync(path.join(DIR, "roteiro.json"), "utf8"));
const OUT = process.argv[2] || path.join(DIR, "Manual_Tacografo_Digital.pptx");
const IMG = (f) => path.join(DIR, "prints", f);

const THEME = {
  name: "Tacografo",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1F2933", lt1: "FFFFFF", dk2: "16191D", lt2: "F2F3F5",
    accent1: "E8A33D", accent2: "2B3138", accent3: "3BA776", accent4: "C94B3B",
    accent5: "8A94A0", accent6: "FCEFD9", hlink: "B5711A", folHlink: "8A94A0",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.title = R.titulo;
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: "ESCURO",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.9, w: 8.8, h: 1.1, fontFace: THEME.headFontFace, fontSize: 40, bold: true, color: C.background1, valign: "middle", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.05, w: 8.8, h: 0.6, fontSize: 20, color: C.accent5, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTEUDO",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.52, w: 9.0, h: 0.6, fontFace: THEME.headFontFace, fontSize: 28, bold: true, color: C.text1, valign: "middle", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Manual do Tacógrafo Digital", options: { x: 0.5, y: 5.2, w: 5, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontSize: 10, color: HEX.accent5, align: "right" },
});

// ---------- Helpers ----------
const kicker = (s, text) =>
  s.addText(text.toUpperCase(), { x: 0.5, y: 0.22, w: 9, h: 0.3, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2, margin: 0, isTextBox: true, objectName: "kicker" });

function framed(s, file, x, y, w, h, name) {
  const p = 0.06;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - p, y: y - p, w: w + 2 * p, h: h + 2 * p, fill: { color: C.text2 }, line: { type: "none" }, rectRadius: 0.08, shadow: { type: "outer", color: "000000", opacity: 0.25, blur: 6, offset: 2, angle: 90 }, objectName: name + "-moldura" });
  s.addImage({ path: IMG(file), x, y, w, h, objectName: name });
}

function circleNum(s, n, x, y, d, name) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.accent1 }, line: { type: "none" }, objectName: name });
  s.addText(String(n), { x, y, w: d, h: d, fontSize: Math.round(d * 34), bold: true, color: C.text2, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
}

function chips(s, list, x, y) {
  let cx = x;
  list.forEach((b, i) => {
    const w = b.length > 2 ? 0.95 : 0.55;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y, w, h: 0.42, fill: { color: C.accent2 }, line: { type: "none" }, rectRadius: 0.08, objectName: "botao-" + i });
    s.addText(b, { x: cx, y, w, h: 0.42, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: "Arial" });
    cx += w + 0.12;
  });
}

function bullets(s, items, x, y, w, h, size = 15) {
  s.addText(
    items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 8 } })),
    { x, y, w, h, fontSize: size, color: C.text1, valign: "top", margin: 0, isTextBox: true, objectName: "instrucoes" }
  );
}

const sectionOf = (sl) => {
  if (sl.parte === "Cadastrar" || sl.parte === "Parte 1") return "Parte 1 · Cadastrar";
  if (sl.parte === "Conectar" || sl.parte === "Parte 2") return "Parte 2 · Conectar";
  if (sl.parte === "Desconectar" || sl.parte === "Parte 3") return "Parte 3 · Desconectar";
  return sl.id <= 3 ? "Introdução" : "Encerramento";
};

// ---------- Slides ----------
let lastSection = null;
for (const sl of R.slides) {
  const sec = sectionOf(sl);
  if (sec !== lastSection) { pres.addSection({ title: sec }); lastSection = sec; }
  const dark = sl.tipo === "capa" || sl.tipo === "divisor";
  const s = pres.addSlide({ masterName: dark ? "ESCURO" : "CONTEUDO", sectionTitle: sec });
  s.addNotes(sl.narracao);

  switch (sl.tipo) {
    case "capa": {
      s.addImage({ path: IMG(sl.imagens[0]), x: 5.1, y: 0, w: 4.9, h: 5.625, sizing: { type: "cover", w: 4.9, h: 5.625 }, transparency: 35, objectName: "capa-foto" });
      s.addText("MANUAL DE USO", { x: 0.6, y: 1.35, w: 4.5, h: 0.4, fontSize: 14, bold: true, color: C.accent1, charSpacing: 3, margin: 0, isTextBox: true });
      s.addText(sl.titulo, { x: 0.6, y: 1.9, w: 4.3, h: 1.1, fontSize: 36, bold: true, color: C.background1, valign: "middle", margin: 0, isTextBox: true, fontFace: THEME.headFontFace, objectName: "titulo-capa" });
      s.addText(sl.subtitulo.replace(" e desconectar", "\ne desconectar"), { placeholder: "body", w: 4.0, h: 1.0 });
      break;
    }
    case "divisor": {
      s.addText(sl.parte.toUpperCase(), { x: 0.6, y: 1.35, w: 6, h: 0.4, fontSize: 14, bold: true, color: C.accent1, charSpacing: 3, margin: 0, isTextBox: true });
      s.addText(sl.titulo, { placeholder: "title" });
      s.addText(sl.subtitulo, { placeholder: "body" });
      circleNum(s, sl.parte.slice(-1), 8.2, 3.9, 1.1, "numero-parte");
      break;
    }
    case "painel": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, "Antes de começar");
      framed(s, sl.imagens[0], 0.5, 1.4, 5.0, 2.8125, "tela-inicial");
      s.addText("TELA INICIAL", { x: 5.9, y: 1.35, w: 3.6, h: 0.3, fontSize: 12, bold: true, color: C.accent5, charSpacing: 2, margin: 0, isTextBox: true });
      s.addText(
        sl.campos.flatMap(([k, v], i) => [
          { text: k, options: { bold: true, color: HEX.hlink, breakLine: true } },
          { text: v, options: { color: HEX.dk1, breakLine: i < sl.campos.length - 1, paraSpaceAfter: 6 } },
        ]),
        { x: 5.9, y: 1.7, w: 3.6, h: 2.6, fontSize: 14, valign: "top", margin: 0, isTextBox: true, objectName: "campos" }
      );
      // Legenda dos botões
      let bx = 0.5;
      sl.botoes.forEach(([b, d], i) => {
        const w = 0.95;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: 4.45, w, h: 0.42, fill: { color: C.accent2 }, line: { type: "none" }, rectRadius: 0.08, objectName: "botao-" + i });
        s.addText(b, { x: bx, y: 4.45, w, h: 0.42, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: "Arial" });
        s.addText(d, { x: bx + w + 0.1, y: 4.38, w: 1.95, h: 0.56, fontSize: 12, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
        bx += w + 2.1;
      });
      break;
    }
    case "visao": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, "Visão geral");
      sl.etapas.forEach(([n, t, d], i) => {
        const x = 0.5 + i * 3.1;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.5, w: 2.8, h: 3.3, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.12, objectName: "cartao-" + n });
        circleNum(s, n, x + 0.3, 1.8, 0.8, "num-" + n);
        s.addText(t, { x: x + 0.3, y: 2.8, w: 2.3, h: 0.5, fontSize: 22, bold: true, color: C.text1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
        s.addText(d, { x: x + 0.3, y: 3.35, w: 2.25, h: 1.3, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true });
      });
      break;
    }
    case "passo": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, `${sl.parte} · Passo ${sl.passo}`);
      framed(s, sl.imagens[0], 0.5, 1.45, 5.6, 3.15, "print");
      circleNum(s, sl.passo, 6.5, 1.45, 0.62, "num-passo");
      bullets(s, sl.instrucoes, 6.5, 2.25, 3.0, 2.1);
      chips(s, sl.botoes, 6.5, 4.3);
      break;
    }
    case "passo_duplo": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, `${sl.parte} · Passo ${sl.passo}`);
      [0, 1].forEach((i) => {
        const x = 0.5 + i * 4.7;
        framed(s, sl.imagens[i], x, 1.4, 4.3, 2.42, "print-" + (i + 1));
        s.addText(sl.legendas[i], { x, y: 3.9, w: 4.3, h: 0.3, fontSize: 12, italic: true, color: C.accent5, margin: 0, isTextBox: true });
      });
      circleNum(s, sl.passo, 0.5, 4.35, 0.55, "num-passo");
      s.addText(
        sl.instrucoes.map((t, i) => ({ text: t, options: { breakLine: i < sl.instrucoes.length - 1 } })),
        { x: 1.25, y: 4.3, w: 5.9, h: 0.75, fontSize: 14, color: C.text1, valign: "middle", margin: 0, isTextBox: true, objectName: "instrucoes" }
      );
      chips(s, sl.botoes, 9.5 - (sl.botoes.length * 0.67 - 0.12), 4.45);
      break;
    }
    case "resultado": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, `${sl.parte} · Passo ${sl.passo}`);
      framed(s, sl.imagens[0], 0.5, 1.45, 5.6, 3.15, "print");
      s.addShape(pres.shapes.OVAL, { x: 6.5, y: 1.45, w: 0.62, h: 0.62, fill: { color: C.accent3 }, line: { type: "none" }, objectName: "ok-icone" });
      s.addText("✓", { x: 6.5, y: 1.45, w: 0.62, h: 0.62, fontSize: 24, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: "Arial" });
      s.addText(sl.mensagem, { x: 6.5, y: 2.25, w: 3.0, h: 1.3, fontSize: 16, color: C.text1, valign: "top", margin: 0, isTextBox: true });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.5, y: 3.7, w: 3.0, h: 0.9, fill: { color: C.accent6 }, line: { type: "none" }, rectRadius: 0.08, objectName: "dica-fundo" });
      s.addText([{ text: "Dica: ", options: { bold: true } }, { text: sl.dica }], { x: 6.65, y: 3.7, w: 2.75, h: 0.9, fontSize: 13, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
      break;
    }
    case "trio": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, sl.parte);
      sl.imagens.forEach((f, i) => {
        const x = 0.5 + i * 3.1;
        framed(s, f, x, 1.45, 2.8, 1.575, "print-" + (i + 1));
        s.addText(sl.legendas[i], { x, y: 3.2, w: 2.8, h: 1.0, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true });
      });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.3, w: 9.0, h: 0.7, fill: { color: C.accent6 }, line: { type: "none" }, rectRadius: 0.08, objectName: "dica-fundo" });
      s.addText([{ text: "Pronto: ", options: { bold: true } }, { text: sl.dica }], { x: 0.7, y: 4.3, w: 8.6, h: 0.7, fontSize: 14, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
      break;
    }
    case "resumo": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, "Encerramento");
      sl.colunas.forEach(([t, items], i) => {
        const x = 0.5 + i * 3.1;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: 2.8, h: 2.45, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.12, objectName: "resumo-" + i });
        circleNum(s, i + 1, x + 0.2, 1.55, 0.45, "resumo-num-" + i);
        s.addText(t, { x: x + 0.8, y: 1.55, w: 1.9, h: 0.45, fontSize: 18, bold: true, color: C.text1, valign: "middle", margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
        s.addText(
          items.map((it, k) => ({ text: it, options: { bullet: { type: "number" }, breakLine: k < items.length - 1, paraSpaceAfter: 4 } })),
          { x: x + 0.2, y: 2.15, w: 2.45, h: 1.75, fontSize: 13, color: C.text1, valign: "top", margin: 0, isTextBox: true }
        );
      });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.1, w: 9.0, h: 0.85, fill: { color: C.accent6 }, line: { type: "none" }, rectRadius: 0.08, objectName: "dicas-fundo" });
      s.addText(
        [{ text: "Lembre-se:  ", options: { bold: true } }, { text: sl.dicas.join("  •  ") }],
        { x: 0.7, y: 4.1, w: 8.6, h: 0.85, fontSize: 14, color: C.text1, valign: "middle", margin: 0, isTextBox: true }
      );
      break;
    }
  }
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");
  await applyTheme(OUT, THEME);
  console.log("OK", OUT);
})();
