/**
 * Deteção LGP — Alfabeto Manual Português
 * Baseado no alfabeto oficial da Associação Portuguesa de Surdos (APS)
 *
 * Landmarks MediaPipe (21 pontos):
 *  0 = pulso
 *  1-4   = polegar  (1=base, 2=meio, 3=IP, 4=ponta)
 *  5-8   = indicador (5=MCP, 6=PIP, 7=DIP, 8=ponta)
 *  9-12  = médio     (9=MCP,10=PIP,11=DIP,12=ponta)
 * 13-16  = anelar   (13=MCP,14=PIP,15=DIP,16=ponta)
 * 17-20  = mindinho (17=MCP,18=PIP,19=DIP,20=ponta)
 */

// ── Utilitários ──────────────────────────────────────────────────────────────

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function touching(a, b, thr = 0.07) { return dist(a, b) < thr; }

function up(lm, tip, pip) { return lm[tip].y < lm[pip].y; }

function curled(lm, tip, mcp) { return lm[tip].y > lm[mcp].y - 0.02; }

function angle(a, b) {
  return Math.atan2(-(b.y - a.y), b.x - a.x) * 180 / Math.PI;
}

// ── Detetor principal ─────────────────────────────────────────────────────────

export function detectLGPLetter(lm) {
  if (!lm || lm.length < 21) return null;

  const iUp = up(lm, 8, 6);
  const mUp = up(lm, 12, 10);
  const rUp = up(lm, 16, 14);
  const pUp = up(lm, 20, 18);

  const thumbOut = lm[4].x < lm[3].x - 0.03 || lm[4].x > lm[3].x + 0.05;
  const thumbUp  = lm[4].y < lm[3].y - 0.04;

  const tTip = lm[4], tIP = lm[3], tMCP = lm[2], tBase = lm[1];
  const iTip = lm[8], iPIP = lm[6], iMCP = lm[5];
  const mTip = lm[12], mPIP = lm[10], mMCP = lm[9];
  const rTip = lm[16], rPIP = lm[14];
  const pTip = lm[20], pPIP = lm[18];

  // A — punho fechado, polegar ao lado
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp) {
    const thumbSide = Math.abs(tTip.x - iMCP.x) < 0.09;
    const thumbNotOver = tTip.y > iTip.y - 0.04;
    if (thumbSide && thumbNotOver) return 'A';
  }

  // B — polegar para cima (joinha), outros fechados
  if (!iUp && !mUp && !rUp && !pUp && thumbUp) {
    return 'B';
  }

  // C — mão curvada em C
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp) {
    const cGap = dist(tTip, iTip);
    const curvedNotFull = lm[8].y > lm[5].y - 0.04 && lm[8].y < lm[5].y + 0.15;
    if (cGap > 0.08 && cGap < 0.22 && curvedNotFull && !thumbOut) return 'C';
  }

  // D — indicador para cima, polegar toca no médio
  if (iUp && !mUp && !rUp && !pUp) {
    if (touching(tTip, mTip, 0.10) || touching(tTip, mMCP, 0.09)) return 'D';
  }

  // E — garra, todos dobrados
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp && !thumbOut) {
    const garra = lm[8].y > lm[6].y + 0.01 && lm[12].y > lm[10].y + 0.01;
    if (garra) return 'E';
  }

  // F — OK: polegar+indicador círculo, 3 estendidos
  if (!iUp && mUp && rUp && pUp) {
    if (touching(tTip, iTip, 0.08)) return 'F';
  }

  // G — indicador horizontal para o lado
  if (iUp && !mUp && !rUp && !pUp) {
    const iAngle = Math.abs(angle(iMCP, iTip));
    if (iAngle > 150 || iAngle < 30) return 'G';
  }

  // H — indicador + médio horizontais juntos
  if (iUp && mUp && !rUp && !pUp) {
    const iAngle = Math.abs(angle(iMCP, iTip));
    const mAngle = Math.abs(angle(mMCP, mTip));
    const bothHoriz = (iAngle > 140 || iAngle < 40) && (mAngle > 140 || mAngle < 40);
    if (bothHoriz) return 'H';
  }

  // I — só mindinho, polegar fechado
  if (!iUp && !mUp && !rUp && pUp && !thumbOut && !thumbUp) {
    return 'I';
  }

  // J — mindinho + polegar (shaka/telefone)
  if (!iUp && !mUp && !rUp && pUp && (thumbOut || thumbUp)) {
    return 'J';
  }

  // K — indicador cima, médio oblíquo, polegar no meio
  if (iUp && mUp && !rUp && !pUp) {
    const spread = Math.abs(iTip.x - mTip.x) > 0.04;
    if (spread && touching(tTip, mPIP, 0.10)) return 'K';
  }

  // L — indicador para cima + polegar para o lado (forma L)
  if (iUp && !mUp && !rUp && !pUp) {
    const thumbHoriz = Math.abs(tTip.y - tMCP.y) < 0.07 && thumbOut;
    const indexVert  = iTip.y < iMCP.y - 0.08;
    if (thumbHoriz && indexVert) return 'L';
  }

  // M — 3 dedos dobrados sobre o polegar
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp) {
    const threeOverThumb =
      lm[8].y > tTip.y - 0.02 &&
      lm[12].y > tTip.y - 0.02 &&
      lm[16].y > tTip.y - 0.02;
    if (threeOverThumb && lm[20].y > lm[17].y - 0.01) return 'M';
  }

  // N — 2 dedos dobrados sobre o polegar
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp) {
    const twoOverThumb = lm[8].y > tTip.y - 0.02 && lm[12].y > tTip.y - 0.02;
    const ringFree = lm[16].y < tTip.y + 0.05;
    if (twoOverThumb && ringFree) return 'N';
  }

  // O — círculo com todos os dedos
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp) {
    if (touching(tTip, iTip, 0.07) && touching(iTip, mTip, 0.08)) return 'O';
  }

  // P — indicador para baixo, polegar para fora
  if (!iUp && !mUp && !rUp && !pUp) {
    const pointDown = lm[8].y > lm[5].y + 0.07;
    if (pointDown && thumbOut) return 'P';
  }

  // Q — indicador + polegar para baixo juntos
  if (!iUp && !mUp && !rUp && !pUp) {
    const idxDown   = lm[8].y > lm[5].y + 0.07;
    const thumbDown = tTip.y > tMCP.y + 0.04;
    if (idxDown && thumbDown && !thumbOut) return 'Q';
  }

  // R — indicador + médio cruzados para cima
  if (iUp && mUp && !rUp && !pUp) {
    const crossed = Math.abs(iTip.x - mTip.x) < 0.03;
    if (crossed && !touching(tTip, mPIP, 0.10)) return 'R';
  }

  // S — punho fechado, polegar por cima dos dedos
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp) {
    const thumbOverFist = tTip.y < lm[8].y + 0.02 && tTip.x > iMCP.x - 0.02;
    if (thumbOverFist) return 'S';
  }

  // T — polegar espetado na base do indicador
  if (!iUp && !mUp && !rUp && !pUp) {
    if (touching(tTip, iPIP, 0.07)) return 'T';
  }

  // U — indicador + médio juntos para cima
  if (iUp && mUp && !rUp && !pUp) {
    const together = Math.abs(iTip.x - mTip.x) < 0.035;
    if (together && !touching(tTip, mPIP, 0.10)) return 'U';
  }

  // V — indicador + médio em V aberto
  if (iUp && mUp && !rUp && !pUp) {
    const vOpen = Math.abs(iTip.x - mTip.x) > 0.05;
    if (vOpen) return 'V';
  }

  // W — 3 dedos estendidos e separados
  if (iUp && mUp && rUp && !pUp) {
    return 'W';
  }

  // X — indicador em gancho
  if (!iUp && !mUp && !rUp && !pUp) {
    const hook = lm[8].y > lm[7].y + 0.01 && lm[7].y < lm[6].y && lm[8].y < lm[5].y;
    if (hook) return 'X';
  }

  // Y — polegar + mindinho (shaka)
  if (!iUp && !mUp && !rUp && pUp && (thumbOut || thumbUp)) {
    return 'Y';
  }

  // Z — indicador para cima, polegar fechado
  if (iUp && !mUp && !rUp && !pUp && !thumbOut) {
    return 'Z';
  }

  return null;
}

// ── Suavização de sinal ───────────────────────────────────────────────────────

export class GestureSmoothing {
  constructor(windowSize = 15, threshold = 0.6) {
    this.windowSize  = windowSize;
    this.threshold   = threshold;
    this.history     = [];
    this.lastConfirmed = null;
    this.confirmCount  = 0;
    this.CONFIRM_FRAMES = 20;
  }

  update(letter) {
    this.history.push(letter);
    if (this.history.length > this.windowSize) this.history.shift();

    const counts = {};
    for (const l of this.history) if (l) counts[l] = (counts[l] || 0) + 1;

    let best = null, bestCount = 0;
    for (const [l, c] of Object.entries(counts)) {
      if (c > bestCount) { best = l; bestCount = c; }
    }

    if (best && bestCount / this.windowSize >= this.threshold) {
      if (best === this.lastConfirmed) this.confirmCount++;
      else { this.lastConfirmed = best; this.confirmCount = 1; }
      return { letter: best, progress: Math.min(this.confirmCount / this.CONFIRM_FRAMES, 1) };
    }

    this.lastConfirmed = null;
    this.confirmCount  = 0;
    return { letter: null, progress: 0 };
  }

  isConfirmed() { return this.confirmCount >= this.CONFIRM_FRAMES; }

  reset() {
    this.history       = [];
    this.lastConfirmed = null;
    this.confirmCount  = 0;
  }
}