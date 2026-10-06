// Gera o manual em PPTX a partir de roteiro.json, da pasta prints/ e da
// identidade visual do Modelo_Apresentacao (pasta modelo/).
// Uso: node build_pptx.js [saida.pptx]
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");

const DIR = __dirname;
const R = JSON.parse(fs.readFileSync(path.join(DIR, "roteiro.json"), "utf8"));
const OUT = process.argv[2] || path.join(DIR, "Manual_Tacografo_Digital.pptx");
const IMG = (f) => path.join(DIR, "prints", f);
const BRAND = (f) => path.join(DIR, "modelo", f);

// Cores e fontes do Modelo_Apresentacao
const THEME = {
  name: "Grupo Dinamo",
  headFontFace: "Montserrat ExtraBold",
  bodyFontFace: "Montserrat Medium",
  colors: {
    dk1: "1A2643", lt1: "FFFFFF", dk2: "1A2643", lt2: "F4F1F6",
    accent1: "D94864", accent2: "F1D08A", accent3: "AA80AE", accent4: "1A2643",
    accent5: "6B7390", accent6: "FBF1DA", hlink: "D94864", folHlink: "AA80AE",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in, igual ao modelo
pres.title = R.titulo;
pres.company = "Grupo Dínamo / Tóliman Transportes";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

// ---------- Layouts (posições copiadas do modelo) ----------
const FAIXAS = { path: BRAND("faixas.png"), x: 6.036, y: 1.082, w: 5.263, h: 6.107 };
const LOGOS = { x: 6.931, y: 0.388, w: 2.629, h: 0.545 };

pres.defineSlideMaster({
  title: "ESCURO",
  background: { color: C.text2 },
  objects: [
    { image: FAIXAS },
    { image: { path: BRAND("logos_toliman_dinamo_branco.png"), ...LOGOS } },
    { placeholder: { options: { name: "title", type: "title", x: 0.737, y: 1.85, w: 5.6, h: 1.15, fontFace: THEME.headFontFace, fontSize: 30, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.737, y: 3.1, w: 5.3, h: 0.9, fontFace: THEME.bodyFontFace, fontSize: 18, color: C.background1, valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTEUDO",
  background: { path: BRAND("fundo_claro.jpg") },
  objects: [
    { image: { path: BRAND("decoracao.png"), x: -3.25, y: -1.5, w: 4.576, h: 3.102 } },
    { image: { path: BRAND("decoracao.png"), x: 8.902, y: 4.637, w: 3.813, h: 2.585 } },
    { image: { path: BRAND("logos_toliman_dinamo_azul.png"), ...LOGOS } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.2, w: 8.3, h: 0.5, fontFace: THEME.headFontFace, fontSize: 24, color: C.text1, valign: "middle", align: "left", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 0.6, y: 5.22, w: 0.5, h: 0.25, fontFace: THEME.bodyFontFace, fontSize: 9, color: HEX.accent5 },
});
pres.defineSlideMaster({
  title: "ENCERRAMENTO",
  background: { color: C.text2 },
  objects: [
    { image: { path: BRAND("decoracao.png"), x: -1.611, y: 3.492, w: 4.576, h: 3.102 } },
    { image: { path: BRAND("decoracao.png"), x: 7.798, y: -0.335, w: 3.813, h: 2.585 } },
    { image: { path: BRAND("encerramento_dinamo_branco.png"), x: 1.609, y: 2.11, w: 6.781, h: 1.406 } },
    { image: { path: BRAND("logos_toliman_dinamo_branco.png"), x: 3.832, y: 4.801, w: 2.336, h: 0.484 } },
  ],
});

// ---------- Helpers ----------
const BODY = THEME.bodyFontFace, HEAD = THEME.headFontFace;

const kicker = (s, text) =>
  s.addText(text.toUpperCase(), { x: 0.6, y: 0.93, w: 6.0, h: 0.28, fontFace: HEAD, fontSize: 11, color: C.accent1, charSpacing: 2, margin: 0, isTextBox: true, objectName: "kicker" });

function framed(s, file, x, y, w, h, name) {
  const p = 0.05;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - p, y: y - p, w: w + 2 * p, h: h + 2 * p, fill: { color: C.text2 }, line: { type: "none" }, rectRadius: 0.08, shadow: { type: "outer", color: "1A2643", opacity: 0.25, blur: 6, offset: 2, angle: 90 }, objectName: name + "-moldura" });
  s.addImage({ path: IMG(file), x, y, w, h, objectName: name });
}

function circleNum(s, n, x, y, d, name, fill = C.accent2) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: name });
  s.addText(String(n), { x, y, w: d, h: d, fontFace: HEAD, fontSize: Math.round(d * 30), color: C.text2, align: "center", valign: "middle", margin: 0, isTextBox: true });
}

function chips(s, list, x, y) {
  let cx = x;
  list.forEach((b, i) => {
    const w = b.length > 2 ? 0.95 : 0.55;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y, w, h: 0.4, fill: { color: C.text2 }, line: { type: "none" }, rectRadius: 0.08, objectName: "botao-" + i });
    s.addText(b, { x: cx, y, w, h: 0.4, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: "Arial" });
    cx += w + 0.12;
  });
}
const chipsWidth = (list) => list.reduce((a, b) => a + (b.length > 2 ? 0.95 : 0.55) + 0.12, -0.12);

function bullets(s, items, x, y, w, h, size = 13) {
  s.addText(
    items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })),
    { x, y, w, h, fontFace: BODY, fontSize: size, color: C.text1, valign: "top", margin: 0, isTextBox: true, objectName: "instrucoes" }
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
  const master = sl.tipo === "encerramento" ? "ENCERRAMENTO" : (sl.tipo === "capa" || sl.tipo === "divisor") ? "ESCURO" : "CONTEUDO";
  const s = pres.addSlide({ masterName: master, sectionTitle: sec });
  if (sl.narracao) s.addNotes(sl.narracao);

  switch (sl.tipo) {
    case "capa":
    case "divisor": {
      const tag = sl.tipo === "capa" ? "MANUAL DE USO" : sl.parte.toUpperCase();
      s.addText(tag, { x: 0.737, y: 1.45, w: 5, h: 0.35, fontFace: HEAD, fontSize: 13, color: C.accent2, charSpacing: 3, margin: 0, isTextBox: true });
      s.addText(sl.titulo, { placeholder: "title" });
      s.addText(sl.subtitulo, { placeholder: "body" });
      break;
    }
    case "encerramento":
      break;
    case "painel": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, "Antes de começar");
      framed(s, sl.imagens[0], 0.6, 1.88, 4.6, 2.59, "tela-inicial");
      s.addText("TELA INICIAL", { x: 5.6, y: 1.85, w: 3.4, h: 0.3, fontFace: HEAD, fontSize: 11, color: C.accent3, charSpacing: 2, margin: 0, isTextBox: true });
      s.addText(
        sl.campos.flatMap(([k, v], i) => [
          { text: k, options: { fontFace: HEAD, color: HEX.accent1, breakLine: true } },
          { text: v, options: { color: HEX.dk1, breakLine: i < sl.campos.length - 1, paraSpaceAfter: 5 } },
        ]),
        { x: 5.6, y: 2.18, w: 3.4, h: 2.3, fontFace: BODY, fontSize: 12, valign: "top", margin: 0, isTextBox: true, objectName: "campos" }
      );
      let bx = 0.6;
      sl.botoes.forEach(([b, d], i) => {
        const w = 0.95;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: 4.68, w, h: 0.4, fill: { color: C.text2 }, line: { type: "none" }, rectRadius: 0.08, objectName: "botao-" + i });
        s.addText(b, { x: bx, y: 4.68, w, h: 0.4, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: "Arial" });
        s.addText(d, { x: bx + w + 0.1, y: 4.6, w: 1.6, h: 0.56, fontFace: BODY, fontSize: 10, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
        bx += w + 1.8;
      });
      break;
    }
    case "visao": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, "Visão geral");
      const fills = [C.accent1, C.accent2, C.accent3];
      sl.etapas.forEach(([n, t, d], i) => {
        const x = 0.6 + i * 2.85;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.9, w: 2.6, h: 2.95, fill: { color: C.background1 }, line: { color: HEX.lt2, width: 1 }, rectRadius: 0.12, shadow: { type: "outer", color: "1A2643", opacity: 0.12, blur: 8, offset: 2, angle: 90 }, objectName: "cartao-" + n });
        circleNum(s, n, x + 0.25, 2.12, 0.7, "num-" + n, fills[i]);
        s.addText(t, { x: x + 0.25, y: 2.95, w: 2.2, h: 0.45, fontFace: HEAD, fontSize: 18, color: C.text1, margin: 0, isTextBox: true });
        s.addText(d, { x: x + 0.25, y: 3.45, w: 2.15, h: 1.25, fontFace: BODY, fontSize: 12, color: C.text1, valign: "top", margin: 0, isTextBox: true });
      });
      break;
    }
    case "passo": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, `${sl.parte} · Passo ${sl.passo}`);
      framed(s, sl.imagens[0], 0.6, 1.88, 5.05, 2.84, "print");
      circleNum(s, sl.passo, 6.1, 1.88, 0.58, "num-passo");
      bullets(s, sl.instrucoes, 6.1, 2.6, 3.0, 1.8);
      chips(s, sl.botoes, 6.1, 4.47);
      break;
    }
    case "passo_duplo": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, `${sl.parte} · Passo ${sl.passo}`);
      [0, 1].forEach((i) => {
        const x = 0.6 + i * 4.2;
        framed(s, sl.imagens[i], x, 1.88, 3.9, 2.19, "print-" + (i + 1));
        s.addText(sl.legendas[i], { x, y: 4.13, w: 3.9, h: 0.26, fontFace: BODY, fontSize: 10, italic: true, color: C.accent5, margin: 0, isTextBox: true });
      });
      circleNum(s, sl.passo, 0.6, 4.55, 0.5, "num-passo");
      const cw = chipsWidth(sl.botoes);
      s.addText(
        sl.instrucoes.map((t, i) => ({ text: t, options: { breakLine: i < sl.instrucoes.length - 1 } })),
        { x: 1.25, y: 4.47, w: 8.6 - cw - 1.45, h: 0.66, fontFace: BODY, fontSize: 11, color: C.text1, valign: "middle", margin: 0, isTextBox: true, objectName: "instrucoes" }
      );
      chips(s, sl.botoes, 8.7 - cw, 4.6);
      break;
    }
    case "resultado": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, `${sl.parte} · Passo ${sl.passo}`);
      framed(s, sl.imagens[0], 0.6, 1.88, 5.05, 2.84, "print");
      s.addShape(pres.shapes.OVAL, { x: 6.1, y: 1.88, w: 0.58, h: 0.58, fill: { color: C.accent3 }, line: { type: "none" }, objectName: "ok-icone" });
      s.addText("✓", { x: 6.1, y: 1.88, w: 0.58, h: 0.58, fontSize: 22, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: "Arial" });
      s.addText(sl.mensagem, { x: 6.1, y: 2.6, w: 3.0, h: 1.2, fontFace: BODY, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.1, y: 3.85, w: 2.75, h: 0.87, fill: { color: C.accent6 }, line: { type: "none" }, rectRadius: 0.08, objectName: "dica-fundo" });
      s.addText([{ text: "Dica: ", options: { fontFace: HEAD } }, { text: sl.dica }], { x: 6.25, y: 3.85, w: 2.5, h: 0.87, fontFace: BODY, fontSize: 11, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
      break;
    }
    case "trio": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, sl.parte);
      sl.imagens.forEach((f, i) => {
        const x = 0.6 + i * 2.9;
        framed(s, f, x, 1.88, 2.65, 1.49, "print-" + (i + 1));
        s.addText(sl.legendas[i], { x, y: 3.5, w: 2.65, h: 0.8, fontFace: BODY, fontSize: 12, color: C.text1, valign: "top", margin: 0, isTextBox: true });
      });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 4.4, w: 8.1, h: 0.62, fill: { color: C.accent6 }, line: { type: "none" }, rectRadius: 0.08, objectName: "dica-fundo" });
      s.addText([{ text: "Pronto: ", options: { fontFace: HEAD } }, { text: sl.dica }], { x: 0.8, y: 4.4, w: 7.8, h: 0.62, fontFace: BODY, fontSize: 12, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
      break;
    }
    case "resumo": {
      s.addText(sl.titulo, { placeholder: "title" });
      kicker(s, "Encerramento");
      const fills = [C.accent1, C.accent2, C.accent3];
      sl.colunas.forEach(([t, items], i) => {
        const x = 0.6 + i * 2.85;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.88, w: 2.6, h: 2.17, fill: { color: C.background1 }, line: { color: HEX.lt2, width: 1 }, rectRadius: 0.12, shadow: { type: "outer", color: "1A2643", opacity: 0.12, blur: 8, offset: 2, angle: 90 }, objectName: "resumo-" + i });
        circleNum(s, i + 1, x + 0.2, 2.0, 0.42, "resumo-num-" + i, fills[i]);
        s.addText(t, { x: x + 0.75, y: 2.0, w: 1.8, h: 0.42, fontFace: HEAD, fontSize: 14, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
        s.addText(
          items.map((it, k) => ({ text: it, options: { bullet: { type: "number" }, breakLine: k < items.length - 1, paraSpaceAfter: 3 } })),
          { x: x + 0.2, y: 2.55, w: 2.3, h: 1.42, fontFace: BODY, fontSize: 11, color: C.text1, valign: "top", margin: 0, isTextBox: true }
        );
      });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 4.2, w: 8.1, h: 0.8, fill: { color: C.accent6 }, line: { type: "none" }, rectRadius: 0.08, objectName: "dicas-fundo" });
      s.addText(
        [{ text: "Lembre-se:  ", options: { fontFace: HEAD } }, { text: sl.dicas.join("  •  ") }],
        { x: 0.8, y: 4.2, w: 7.7, h: 0.8, fontFace: BODY, fontSize: 12, color: C.text1, valign: "middle", margin: 0, isTextBox: true }
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
