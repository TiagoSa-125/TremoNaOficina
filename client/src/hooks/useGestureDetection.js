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
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);
}

function touching(a, b, thr = 0.07) { return dist(a, b) < thr; }

// Dedo estendido: ponta mais alta (menor y) que a articulação PIP
function up(lm, tip, pip) { return lm[tip].y < lm[pip].y; }

// Dedo dobrado: ponta mais baixa que MCP (fechado)
function curled(lm, tip, mcp) { return lm[tip].y > lm[mcp].y - 0.02; }

// Ângulo do vetor entre dois pontos (graus, 0=direita, 90=cima)
function angle(a, b) {
  return Math.atan2(-(b.y - a.y), b.x - a.x) * 180 / Math.PI;
}

// ── Detetor principal ─────────────────────────────────────────────────────────

export function detectLGPLetter(lm) {
  if (!lm || lm.length < 21) return null;

  // Estado de cada dedo
  const iUp = up(lm, 8, 6);   // indicador
  const mUp = up(lm, 12, 10); // médio
  const rUp = up(lm, 16, 14); // anelar
  const pUp = up(lm, 20, 18); // mindinho (pinky)

  const iCurl = curled(lm, 8, 5);
  const mCurl = curled(lm, 12, 9);
  const rCurl = curled(lm, 16, 13);
  const pCurl = curled(lm, 20, 17);

  // Polegar: considera estendido se ponta está à esquerda da base (mão direita espelhada)
  const thumbOut = lm[4].x < lm[3].x - 0.02 || lm[4].x > lm[3].x + 0.04;
  const thumbUp  = lm[4].y < lm[3].y - 0.03;

  // Pontas e articulações úteis
  const wrist = lm[0];
  const tTip  = lm[4],  tIP = lm[3], tMCP = lm[2];
  const iTip  = lm[8],  iPIP = lm[6], iMCP = lm[5];
  const mTip  = lm[12], mPIP = lm[10];
  const rTip  = lm[16], rPIP = lm[14];
  const pTip  = lm[20], pPIP = lm[18];

  // ── A: punho fechado, polegar ao lado (não por cima) ──────────────────────
  // Todos fechados, polegar lateral (não sobre os dedos)
  if (!iUp && !mUp && !rUp && !pUp) {
    const thumbOverFist = tTip.y < iTip.y + 0.05 && tTip.x > iMCP.x - 0.05;
    if (!thumbOverFist && tTip.x < iMCP.x + 0.04) return 'A';
  }

  // ── B: 4 dedos estendidos juntos, polegar dobrado para dentro ─────────────
  if (iUp && mUp && rUp && pUp) {
    const spread = Math.abs(iTip.x - pTip.x);
    if (spread < 0.14 && !thumbOut) return 'B';
  }

  // ── C: mão curvada em C (semi-fechada), todos os dedos curvados juntos ────
  if (!iUp && !mUp && !rUp && !pUp) {
    // Ponta do indicador e polegar formam abertura de C
    const cGap = dist(tTip, iTip);
    const fingersCurvedNotFull = lm[8].y > lm[5].y - 0.05 && lm[8].y < lm[5].y + 0.12;
    if (cGap > 0.07 && cGap < 0.22 && fingersCurvedNotFull) return 'C';
  }

  // ── D: indicador para cima em arco, outros fechados, polegar toca no médio ─
  if (iUp && !mUp && !rUp && !pUp) {
    if (touching(tTip, mTip, 0.09)) return 'D';
  }

  // ── E: todos os dedos dobrados (em garra), polegar por baixo ──────────────
  if (!iUp && !mUp && !rUp && !pUp) {
    // Pontas dos dedos tocam na palma / abaixo do PIP
    const garra = lm[8].y > lm[6].y && lm[12].y > lm[10].y;
    if (garra && touching(tTip, iPIP, 0.08)) return 'E';
  }

  // ── F: polegar + indicador fazem OK/círculo, outros 3 estendidos ──────────
  if (!iUp && mUp && rUp && pUp) {
    if (touching(tTip, iTip, 0.07)) return 'F';
  }

  // ── G: indicador e polegar apontam horizontalmente para o lado (pistola) ──
  if (iUp && !mUp && !rUp && !pUp) {
    // Indicador quase horizontal
    const iAngle = Math.abs(angle(iMCP, iTip));
    if (iAngle > 150 || iAngle < 30) return 'G'; // horizontal esq ou dir
  }

  // ── H: indicador + médio estendidos e horizontais ─────────────────────────
  if (iUp && mUp && !rUp && !pUp) {
    const iAngle = Math.abs(angle(iMCP, iTip));
    const mAngle = Math.abs(angle(lm[9], mTip));
    const bothHoriz = (iAngle > 140 || iAngle < 40) && (mAngle > 140 || mAngle < 40);
    const close = Math.abs(iTip.y - mTip.y) < 0.06;
    if (bothHoriz && close) return 'H';
  }

  // ── I: só mindinho estendido, polegar dobrado ─────────────────────────────
  if (!iUp && !mUp && !rUp && pUp) {
    if (!thumbOut) return 'I';
  }

  // ── J: mindinho estendido + polegar para fora (como Y mas sem anelar) ─────
  if (!iUp && !mUp && !rUp && pUp) {
    if (thumbOut) return 'J';
  }

  // ── K: indicador para cima, médio para o lado, polegar no meio ────────────
  if (iUp && mUp && !rUp && !pUp) {
    const vSpread = Math.abs(iTip.x - mTip.x) > 0.04;
    if (vSpread && touching(tTip, mPIP, 0.09)) return 'K';
  }

  // ── L: polegar estendido horizontal + indicador para cima (forma L) ───────
  if (iUp && !mUp && !rUp && !pUp) {
    // Polegar claramente horizontal e indicador claramente vertical
    const thumbHoriz = Math.abs(tTip.y - tMCP.y) < 0.07;
    const indexVert  = iTip.y < iMCP.y - 0.1;
    if (thumbHoriz && indexVert && dist(tTip, iTip) > 0.1) return 'L';
  }

  // ── M: 3 dedos (ind+med+anel) dobrados sobre o polegar ───────────────────
  if (!iUp && !mUp && !rUp && !pUp) {
    const threeOverThumb = lm[8].y > tTip.y && lm[12].y > tTip.y && lm[16].y > tTip.y;
    if (threeOverThumb && lm[20].y > lm[17].y) return 'M';
  }

  // ── N: indicador + médio dobrados sobre o polegar ────────────────────────
  if (!iUp && !mUp && !rUp && !pUp) {
    const twoOverThumb = lm[8].y > tTip.y && lm[12].y > tTip.y;
    const ringNotOver  = lm[16].y < tTip.y + 0.06;
    if (twoOverThumb && ringNotOver) return 'N';
  }

  // ── O: todos os dedos curvados a tocar no polegar (forma O) ───────────────
  if (!iUp && !mUp && !rUp && !pUp) {
    if (touching(tTip, iTip, 0.06) && touching(iTip, mTip, 0.07)) return 'O';
  }

  // ── P: indicador aponta para baixo, polegar para fora, resto fechado ──────
  if (!iUp && !mUp && !rUp && !pUp) {
    const pointDown = lm[8].y > lm[5].y + 0.08;
    if (pointDown && thumbOut) return 'P';
  }

  // ── Q: indicador e polegar apontam para baixo ─────────────────────────────
  if (!iUp && !mUp && !rUp && !pUp) {
    const idxDown   = lm[8].y > lm[5].y + 0.08;
    const thumbDown = tTip.y > tMCP.y + 0.04;
    if (idxDown && thumbDown && !thumbOut) return 'Q';
  }

  // ── R: indicador e médio cruzados (entrelaçados) ──────────────────────────
  if (iUp && mUp && !rUp && !pUp) {
    const crossed = Math.abs(iTip.x - mTip.x) < 0.025;
    if (crossed) return 'R';
  }

  // ── S: punho fechado, polegar POR CIMA dos dedos ──────────────────────────
  if (!iUp && !mUp && !rUp && !pUp) {
    const thumbOverFist = tTip.y < lm[8].y && tTip.x > iMCP.x - 0.02;
    if (thumbOverFist) return 'S';
  }

  // ── T: polegar espetado entre indicador e médio (punho) ───────────────────
  if (!iUp && !mUp && !rUp && !pUp) {
    if (touching(tTip, iPIP, 0.06)) return 'T';
  }

  // ── U: indicador e médio juntos e estendidos ─────────────────────────────
  if (iUp && mUp && !rUp && !pUp) {
    const together = Math.abs(iTip.x - mTip.x) < 0.03;
    if (together) return 'U';
  }

  // ── V: indicador e médio em V aberto ─────────────────────────────────────
  if (iUp && mUp && !rUp && !pUp) {
    const vOpen = Math.abs(iTip.x - mTip.x) > 0.05;
    if (vOpen && !touching(tTip, mPIP, 0.09)) return 'V';
  }

  // ── W: indicador, médio e anelar estendidos ───────────────────────────────
  if (iUp && mUp && rUp && !pUp) {
    return 'W';
  }

  // ── X: indicador dobrado em gancho (ponta virada para a palma) ────────────
  if (!iUp && !mUp && !rUp && !pUp) {
    const hook = lm[8].y > lm[7].y + 0.01 && lm[7].y < lm[6].y;
    if (hook) return 'X';
  }

  // ── Y: polegar + mindinho estendidos, outros fechados ────────────────────
  if (!iUp && !mUp && !rUp && pUp) {
    if (thumbOut || thumbUp) return 'Y';
  }

  // ── Z: indicador estendido vertical (desenha Z no ar) ────────────────────
  if (iUp && !mUp && !rUp && !pUp) {
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
