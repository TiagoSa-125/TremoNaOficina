/**
 * Classificador k-NN para gestos LGP
 * ─────────────────────────────────────────────────────────────────────────
 * Em vez de regras geométricas fixas (if/else), este classificador compara
 * os 21 landmarks da mão atual com exemplos gravados pelo utilizador no
 * Modo de Treino, e devolve a letra do exemplo mais parecido (ou a moda
 * dos k mais parecidos).
 *
 * Os dados de treino vêm de /lgp-training-data.json (em client/public/),
 * gerado e exportado pelo TrainingMode.jsx.
 */

// ── Normalização ──────────────────────────────────────────────────────────
// Torna a comparação invariante à posição da mão no ecrã e ao tamanho da mão
// (distância à câmara): usa o pulso (landmark 0) como origem e normaliza
// pela distância pulso → MCP do médio (landmark 9).
export function normalizeLandmarks(lm) {
  if (!lm || lm.length < 21) return null;

  const wrist = lm[0];
  const ref = lm[9]; // MCP do médio — bom proxy para "tamanho da mão"
  const scale = Math.sqrt(
    (ref.x - wrist.x) ** 2 +
    (ref.y - wrist.y) ** 2 +
    (ref.z - wrist.z) ** 2
  ) || 1;

  return lm.map(p => [
    (p.x - wrist.x) / scale,
    (p.y - wrist.y) / scale,
    (p.z - wrist.z) / scale,
  ]).flat(); // -> array de 63 números
}

// ── Distância euclidiana entre dois vetores normalizados ───────────────────
function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// ── Classificador k-NN ──────────────────────────────────────────────────────
export class KNNClassifier {
  constructor(trainingData = [], k = 5, maxDistance = 1.4) {
    // trainingData: [{ letter: 'A', vector: [63 números] }, ...]
    this.data = trainingData;
    this.k = k;
    this.maxDistance = maxDistance; // acima disto, considera "não reconhecido"
  }

  get size() {
    return this.data.length;
  }

  // Quantos exemplos existem por letra
  countsByLetter() {
    const counts = {};
    for (const ex of this.data) {
      counts[ex.letter] = (counts[ex.letter] || 0) + 1;
    }
    return counts;
  }

  // Devolve { letter, confidence } ou { letter: null, confidence: 0 }
  predict(lm) {
    if (this.data.length === 0) return { letter: null, confidence: 0 };

    const vec = normalizeLandmarks(lm);
    if (!vec) return { letter: null, confidence: 0 };

    // Calcula distância a todos os exemplos
    const distances = this.data.map(ex => ({
      letter: ex.letter,
      dist: distance(vec, ex.vector),
    }));

    distances.sort((a, b) => a.dist - b.dist);

    const nearest = distances.slice(0, Math.min(this.k, distances.length));

    // Se até o mais próximo está muito longe, não reconhece nada
    if (nearest[0].dist > this.maxDistance) {
      return { letter: null, confidence: 0 };
    }

    // Votação: conta ocorrências de cada letra entre os k mais próximos,
    // pesado pelo inverso da distância (mais perto = mais peso)
    const votes = {};
    for (const n of nearest) {
      const weight = 1 / (n.dist + 0.05);
      votes[n.letter] = (votes[n.letter] || 0) + weight;
    }

    let bestLetter = null, bestVote = 0, totalVote = 0;
    for (const [letter, vote] of Object.entries(votes)) {
      totalVote += vote;
      if (vote > bestVote) { bestVote = vote; bestLetter = letter; }
    }

    const confidence = totalVote > 0 ? bestVote / totalVote : 0;

    return { letter: bestLetter, confidence };
  }
}

// ── Carregar dados de treino do ficheiro JSON ──────────────────────────────
export async function loadTrainingData() {
  try {
    const res = await fetch('/lgp-training-data.json');
    if (!res.ok) return [];
    const json = await res.json();
    // json esperado: { "A": [[63 números], [63 números], ...], "B": [...], ... }
    const data = [];
    for (const [letter, examples] of Object.entries(json)) {
      for (const vector of examples) {
        if (Array.isArray(vector) && vector.length === 63) {
          data.push({ letter, vector });
        }
      }
    }
    return data;
  } catch (err) {
    console.warn('Não foi possível carregar lgp-training-data.json:', err);
    return [];
  }
}

// ── Suavização de sinal (igual à anterior) ──────────────────────────────────
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
