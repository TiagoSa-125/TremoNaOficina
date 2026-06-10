/**
 * Deteção LGP — Alfabeto Manual Português
 * Baseado na imagem oficial da Associação Portuguesa de Surdos (APS)
 *
 * NOTA CÂMARA: o vídeo é espelhado (scaleX(-1)), mas os landmarks do MediaPipe
 * NÃO são espelhados — continuam em coordenadas reais. Ou seja, quando o
 * utilizador levanta a mão direita, lm[4].x (polegar) está à ESQUERDA no ecrã
 * mas com valor x MAIOR nos landmarks. Temos de ter isso em conta.
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

// Dedo estendido: ponta mais alta (menor y) que PIP
function up(lm, tip, pip) { return lm[tip].y < lm[pip].y - 0.02; }

// Dedo claramente dobrado: ponta abaixo do MCP
function curled(lm, tip, mcp) { return lm[tip].y > lm[mcp].y + 0.01; }

// Ângulo do vetor entre dois pontos (graus)
function angle(a, b) {
  return Math.atan2(-(b.y - a.y), b.x - a.x) * 180 / Math.PI;
}

// Determina se a mão é direita ou esquerda com base nos landmarks
// Na mão direita (espelhada na câmara): pulso está à direita do mindinho nos landmarks reais
function isRightHand(lm) {
  return lm[17].x > lm[5].x; // mindinho MCP à direita do indicador MCP = mão direita
}

// ── Detetor principal ─────────────────────────────────────────────────────────

export function detectLGPLetter(lm) {
  if (!lm || lm.length < 21) return null;

  const rightHand = isRightHand(lm);

  // Dedos estendidos
  const iUp = up(lm, 8, 6);    // indicador
  const mUp = up(lm, 12, 10);  // médio
  const rUp = up(lm, 16, 14);  // anelar
  const pUp = up(lm, 20, 18);  // mindinho

  // Dedos dobrados
  const iCurl = curled(lm, 8, 5);
  const mCurl = curled(lm, 12, 9);
  const rCurl = curled(lm, 16, 13);
  const pCurl = curled(lm, 20, 17);

  // Polegar: em mão direita espelhada, "para fora" significa x MAIOR (vai para a direita nos landmarks = esquerda no ecrã)
  // Em mão esquerda é o inverso
  const thumbTip = lm[4];
  const thumbIP  = lm[3];
  const thumbMCP = lm[2];
  const thumbBase= lm[1];

  // Polegar estendido para cima (y menor que base)
  const thumbUp = thumbTip.y < thumbBase.y - 0.06;

  // Polegar para o lado (afastado lateralmente da palma)
  // Mão direita: polegar "para fora" = x maior; mão esquerda: x menor
  const thumbOut = rightHand
    ? thumbTip.x > thumbIP.x + 0.03
    : thumbTip.x < thumbIP.x - 0.03;

  // Polegar dobrado sobre a palma (não para fora nem para cima)
  const thumbIn = !thumbUp && !thumbOut;

  // Atalhos
  const iTip = lm[8],  iPIP = lm[6],  iMCP = lm[5];
  const mTip = lm[12], mPIP = lm[10], mMCP = lm[9];
  const rTip = lm[16], rPIP = lm[14];
  const pTip = lm[20], pPIP = lm[18];
  const wrist = lm[0];

  // Profundidade (z): valor mais negativo = mais perto da câmara
  // Útil para detetar dedos tapados/apontados para a câmara

  // ── A: punho fechado, polegar ao lado (não por cima) ──────────────────────
  // Imagem APS: mão fechada, polegar encostado lateralmente ao indicador
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp && !thumbOut) {
    const thumbBesideFist = Math.abs(thumbTip.y - iTip.y) < 0.08;
    if (thumbBesideFist) return 'A';
  }

  // ── B: polegar para cima (joinha) ─────────────────────────────────────────
  // Imagem APS: punho fechado com só o polegar levantado
  if (!iUp && !mUp && !rUp && !pUp && thumbUp) {
    return 'B';
  }

  // ── C: mão curvada em C ────────────────────────────────────────────────────
  // Imagem APS: todos os dedos semi-curvados formando arco, polegar em oposição
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp) {
    const gap = dist(thumbTip, iTip);
    const iMid = (lm[8].y + lm[6].y) / 2;
    const curved = lm[8].y > lm[5].y - 0.03 && lm[8].y < lm[5].y + 0.18;
    if (gap > 0.09 && gap < 0.25 && curved && thumbOut) return 'C';
  }

  // ── D: indicador para cima, polegar toca médio, outros fechados ────────────
  // Imagem APS: indicador levantado, polegar encosta no médio dobrado
  if (iUp && !mUp && !rUp && !pUp) {
    if (touching(thumbTip, mTip, 0.11) || touching(thumbTip, mMCP, 0.10)) return 'D';
  }

  // ── E: todos os dedos dobrados em garra ────────────────────────────────────
  // Imagem APS: pontas dobradas para a palma, como uma garra
  if (!iUp && !mUp && !rUp && !pUp && thumbIn) {
    const garra = lm[8].y > lm[6].y + 0.02 && lm[12].y > lm[10].y + 0.02
                && lm[16].y > lm[14].y + 0.01;
    if (garra) return 'E';
  }

  // ── F: OK — polegar+indicador em círculo, 3 dedos estendidos ───────────────
  // Imagem APS: sinal OK clássico
  if (!iUp && mUp && rUp && pUp) {
    if (touching(thumbTip, iTip, 0.09)) return 'F';
  }

  // ── G: indicador + polegar horizontais para o lado (pistola deitada) ───────
  // Imagem APS: indicador apontado para o lado, polegar para cima dessa forma
  if (iUp && !mUp && !rUp && !pUp) {
    const iAng = Math.abs(angle(iMCP, iTip));
    const isHoriz = iAng > 145 || iAng < 35;
    if (isHoriz) return 'G';
  }

  // ── H: indicador + médio horizontais, juntos ──────────────────────────────
  // Imagem APS: dois dedos apontados para o lado, paralelos
  if (iUp && mUp && !rUp && !pUp) {
    const iAng = Math.abs(angle(iMCP, iTip));
    const mAng = Math.abs(angle(mMCP, mTip));
    const bothH = (iAng > 140 || iAng < 40) && (mAng > 140 || mAng < 40);
    if (bothH) return 'H';
  }

  // ── I: só mindinho estendido, polegar dobrado ──────────────────────────────
  // Imagem APS: mindinho levantado, resto fechado
  if (!iUp && !mUp && !rUp && pUp && thumbIn) {
    return 'I';
  }

  // ── J: mindinho + polegar estendidos (shaka / telefone) ───────────────────
  // Imagem APS: polegar + mindinho abertos, 3 do meio fechados
  if (!iUp && !mUp && !rUp && pUp && (thumbOut || thumbUp)) {
    return 'J';
  }

  // ── K: indicador para cima, médio oblíquo, polegar entre os dois ──────────
  // Imagem APS: índice vertical, médio saído, polegar no meio
  if (iUp && mUp && !rUp && !pUp) {
    const spread = Math.abs(iTip.x - mTip.x) > 0.04;
    if (spread && touching(thumbTip, mPIP, 0.11)) return 'K';
  }

  // ── L: indicador para cima + polegar para o lado ──────────────────────────
  // Imagem APS: forma de L clara
  if (iUp && !mUp && !rUp && !pUp && thumbOut) {
    const indexVert = iTip.y < iMCP.y - 0.07;
    if (indexVert) return 'L';
  }

  // ── M: 3 dedos (ind+med+anel) dobrados sobre o polegar ────────────────────
  // Imagem APS: três dedos por cima do polegar
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp && !thumbOut) {
    const threeOver =
      lm[8].y  > thumbTip.y - 0.03 &&
      lm[12].y > thumbTip.y - 0.03 &&
      lm[16].y > thumbTip.y - 0.03;
    const pinkyDown = lm[20].y > lm[17].y;
    if (threeOver && pinkyDown) return 'M';
  }

  // ── N: indicador + médio dobrados sobre o polegar ─────────────────────────
  // Imagem APS: dois dedos por cima do polegar, anelar e mindinho livres/baixos
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp && !thumbOut) {
    const twoOver =
      lm[8].y  > thumbTip.y - 0.03 &&
      lm[12].y > thumbTip.y - 0.03;
    const ringLower = lm[16].y < thumbTip.y + 0.04;
    if (twoOver && ringLower) return 'N';
  }

  // ── O: todos os dedos curvados formando O com polegar ─────────────────────
  // Imagem APS: círculo fechado
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp) {
    if (touching(thumbTip, iTip, 0.08) && touching(iTip, mTip, 0.09)) return 'O';
  }

  // ── P: mão inclinada, indicador aponta para baixo/frente, polegar para fora
  // Imagem APS: mão virada, indicador a apontar para baixo
  if (!iUp && !mUp && !rUp && !pUp) {
    const pointDown = lm[8].y > lm[5].y + 0.06;
    if (pointDown && thumbOut) return 'P';
  }

  // ── Q: indicador + polegar apontam para baixo juntos ─────────────────────
  // Imagem APS: pinça virada para baixo
  if (!iUp && !mUp && !rUp && !pUp) {
    const idxDown   = lm[8].y > lm[5].y + 0.06;
    const thumbDown = thumbTip.y > thumbMCP.y + 0.04;
    if (idxDown && thumbDown && !thumbOut) return 'Q';
  }

  // ── R: indicador inclinado para a frente, médio reto, polegar a apoiar o indicador
  // Imagem APS: indicador apontado para a frente/baixo (não totalmente vertical),
  // médio bem vertical, polegar encostado por baixo do indicador como apoio
  if (iUp && mUp && !rUp && !pUp) {
    const indexLeansForward = (iTip.y - iMCP.y) > (mTip.y - mMCP.y) + 0.02; // indicador menos vertical que médio
    const thumbSupports = touching(thumbTip, iPIP, 0.09) || touching(thumbTip, iMCP, 0.09);
    if (indexLeansForward && thumbSupports) return 'R';
  }

  // ── S: punho fechado, polegar por cima dos dedos ─────────────────────────
  // Imagem APS: polegar dobrado sobre os outros dedos fechados
  if (!iUp && !mUp && !rUp && !pUp && !thumbUp && !thumbOut) {
    const thumbOverFist = thumbTip.y < lm[8].y + 0.03;
    if (thumbOverFist) return 'S';
  }

  // ── T: polegar espetado entre indicador e médio ───────────────────────────
  // Imagem APS: punho, polegar sai entre ind. e médio
  if (!iUp && !mUp && !rUp && !pUp) {
    if (touching(thumbTip, iPIP, 0.08)) return 'T';
  }

  // ── U: indicador + médio juntos para cima (sem separação) ────────────────
  // Imagem APS: dois dedos colados levantados
  if (iUp && mUp && !rUp && !pUp) {
    const together = Math.abs(iTip.x - mTip.x) < 0.04;
    if (together && !touching(thumbTip, mPIP, 0.10)) return 'U';
  }

  // ── V: indicador + médio em V aberto ─────────────────────────────────────
  // Imagem APS: tesoura / paz
  if (iUp && mUp && !rUp && !pUp) {
    const vOpen = Math.abs(iTip.x - mTip.x) > 0.05;
    if (vOpen) return 'V';
  }

  // ── W: 3 dedos estendidos e separados ────────────────────────────────────
  // Imagem APS: indicador, médio e anelar abertos
  if (iUp && mUp && rUp && !pUp) {
    return 'W';
  }

  // ── X: indicador + médio entrelaçados/cruzados, ambos para cima ───────────
  // Imagem APS: dois dedos cruzados um sobre o outro, apontando para cima
  if (iUp && mUp && !rUp && !pUp) {
    const crossedX = Math.abs(iTip.x - mTip.x) < 0.025;
    if (crossedX) return 'X';
  }

  // ── Y: polegar + mindinho (shaka) ────────────────────────────────────────
  // Imagem APS: polegar e mindinho abertos, 3 do meio fechados
  if (!iUp && !mUp && !rUp && pUp && (thumbOut || thumbUp)) {
    return 'Y';
  }

  // ── Z: indicador para cima, polegar fechado ───────────────────────────────
  // Imagem APS: indicador levantado sozinho (faz Z no ar)
  if (iUp && !mUp && !rUp && !pUp && !thumbOut && !thumbUp) {
    return 'Z';
  }

  return null;
}

// ── Suavização de sinal ───────────────────────────────────────────────────────

export class GestureSmoothing {
  constructor(windowSize = 15, threshold = 0.6) {
    this.windowSize    = windowSize;
    this.threshold     = threshold;
    this.history       = [];
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
