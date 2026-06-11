import React, { useEffect, useRef, useState } from 'react';
import { normalizeLandmarks } from '../hooks/useKNNClassifier';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ─────────────────────────────────────────────────────────────────────────
//  MODO DE TREINO
//  Grava exemplos (landmarks normalizados) para cada letra do alfabeto LGP.
//  No fim, exporta um ficheiro lgp-training-data.json para colocar em
//  client/public/.
// ─────────────────────────────────────────────────────────────────────────
export default function TrainingMode({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const lastLandmarksRef = useRef(null);

  const [status, setStatus] = useState('A iniciar câmara...');
  const [error, setError] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [dataset, setDataset] = useState({}); // { A: [vector, vector, ...], B: [...] }
  const [flash, setFlash] = useState(false);

  // ── Carregar dataset existente (se já houver um JSON colocado em public/) ──
  useEffect(() => {
    fetch('/lgp-training-data.json')
      .then(r => (r.ok ? r.json() : {}))
      .then(json => setDataset(json || {}))
      .catch(() => setDataset({}));
  }, []);

  // ── Iniciar câmara + MediaPipe ──────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { Hands, HAND_CONNECTIONS } = await import('@mediapipe/hands');
        const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

        const hands = new Hands({ locateFile: f => `/mediapipe/hands/${f}` });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(results => {
          if (!mounted) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.multiHandLandmarks?.length > 0) {
            const lm = results.multiHandLandmarks[0];
            drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: '#ff6b00', lineWidth: 2 });
            drawLandmarks(ctx, lm, { color: '#ffaa00', lineWidth: 1, radius: 3 });
            lastLandmarksRef.current = lm;
            setStatus('Mão detetada ✋ — pronta para gravar');
          } else {
            lastLandmarksRef.current = null;
            setStatus('Mostra a mão à câmara');
          }
        });

        handsRef.current = hands;

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('O browser não permite câmara neste endereço. Usa HTTPS, localhost, ou a porta pública do Codespace.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          await videoRef.current.play();
          setStatus('Mostra a mão à câmara');
          const loop = async () => {
            if (!mounted) return;
            if (videoRef.current && handsRef.current) {
              try {
                await handsRef.current.send({ image: videoRef.current });
              } catch (err) {
                console.error('Erro MediaPipe:', err);
                if (mounted) setError(`Erro no MediaPipe: ${err.message}`);
                return;
              }
            }
            requestAnimationFrame(loop);
          };
          loop();
        };
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message);
      }
    };

    init();

    return () => {
      mounted = false;
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      if (handsRef.current) handsRef.current.close?.();
    };
  }, []);

  // ── Gravar um exemplo da letra selecionada ──────────────────────────────
  const recordExample = () => {
    const lm = lastLandmarksRef.current;
    if (!lm) {
      setStatus('⚠️ Nenhuma mão detetada — não foi possível gravar');
      return;
    }
    const vector = normalizeLandmarks(lm);
    if (!vector) return;

    setDataset(prev => {
      const next = { ...prev };
      next[selectedLetter] = [...(next[selectedLetter] || []), vector];
      return next;
    });

    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  };

  // ── Apagar último exemplo da letra selecionada ──────────────────────────
  const undoLast = () => {
    setDataset(prev => {
      const next = { ...prev };
      if (next[selectedLetter]?.length) {
        next[selectedLetter] = next[selectedLetter].slice(0, -1);
      }
      return next;
    });
  };

  // ── Apagar todos os exemplos da letra selecionada ───────────────────────
  const clearLetter = () => {
    if (!window.confirm(`Apagar todos os exemplos da letra ${selectedLetter}?`)) return;
    setDataset(prev => {
      const next = { ...prev };
      delete next[selectedLetter];
      return next;
    });
  };

  // ── Exportar dataset completo como JSON ─────────────────────────────────
  const exportData = () => {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lgp-training-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Atalhos de teclado: setas para mudar de letra, espaço/Enter para gravar
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        recordExample();
      } else if (e.key === 'ArrowRight') {
        setSelectedLetter(l => {
          const i = ALPHABET.indexOf(l);
          return ALPHABET[(i + 1) % ALPHABET.length];
        });
      } else if (e.key === 'ArrowLeft') {
        setSelectedLetter(l => {
          const i = ALPHABET.indexOf(l);
          return ALPHABET[(i - 1 + ALPHABET.length) % ALPHABET.length];
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const totalExamples = Object.values(dataset).reduce((sum, arr) => sum + arr.length, 0);
  const currentCount = dataset[selectedLetter]?.length || 0;

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Voltar</button>
        <h1 style={s.title}>🎓 Modo de Treino LGP</h1>
        <div style={s.totalBadge}>{totalExamples} exemplos no total</div>
      </div>

      <div style={s.main}>
        {/* Câmara */}
        <div style={s.cameraBox}>
          <div style={{ ...s.cameraWrap, ...(flash ? s.cameraFlash : {}) }}>
            <video ref={videoRef} style={s.video} playsInline muted />
            <canvas ref={canvasRef} width={640} height={480} style={s.canvas} />
          </div>
          <p style={s.status}>{status}</p>
          {error && <p style={s.error}>⚠️ {error}</p>}
        </div>

        {/* Painel de controlo */}
        <div style={s.controlPanel}>
          <h2 style={s.letterTitle}>Letra: <span style={s.letterBig}>{selectedLetter}</span></h2>
          <p style={s.count}>{currentCount} exemplo{currentCount !== 1 ? 's' : ''} gravado{currentCount !== 1 ? 's' : ''}</p>

          {/* Grid de letras */}
          <div style={s.alphabetGrid}>
            {ALPHABET.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLetter(l)}
                style={{
                  ...s.letterBtn,
                  ...(l === selectedLetter ? s.letterBtnActive : {}),
                  ...(dataset[l]?.length ? s.letterBtnHasData : {}),
                }}
              >
                {l}
                {dataset[l]?.length > 0 && (
                  <span style={s.letterCount}>{dataset[l].length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Ações */}
          <div style={s.actions}>
            <button style={s.recordBtn} onClick={recordExample}>
              📸 Gravar exemplo (Espaço)
            </button>
            <div style={s.smallActions}>
              <button style={s.smallBtn} onClick={undoLast} disabled={currentCount === 0}>
                ↩️ Desfazer último
              </button>
              <button style={{ ...s.smallBtn, ...s.dangerBtn }} onClick={clearLetter} disabled={currentCount === 0}>
                🗑️ Limpar letra
              </button>
            </div>
            <button style={s.exportBtn} onClick={exportData} disabled={totalExamples === 0}>
              💾 Exportar lgp-training-data.json
            </button>
          </div>

          <div style={s.instructions}>
            <h3 style={s.instrTitle}>Como usar</h3>
            <ol style={s.instrList}>
              <li>Escolhe a letra (clica na grelha ou usa ← →)</li>
              <li>Faz o gesto LGP correspondente à frente da câmara</li>
              <li>Carrega "Gravar exemplo" (ou Espaço/Enter) — repete 15-20 vezes por letra, variando ligeiramente o ângulo/posição da mão</li>
              <li>Repete para todas as 26 letras</li>
              <li>Clica "Exportar" — descarrega <code>lgp-training-data.json</code></li>
              <li>Coloca esse ficheiro em <code>client/public/lgp-training-data.json</code> (substitui o existente)</li>
              <li>Reinicia a app — a deteção passa a usar os teus exemplos!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  screen: {
    minHeight: '100vh',
    background: '#0a0a0f',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    padding: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  backBtn: {
    background: '#1a1a2e',
    border: '1px solid #333',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    color: '#ffaa00',
  },
  totalBadge: {
    background: '#1a1a2e',
    border: '1px solid #ff6b00',
    color: '#ff6b00',
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
  },
  main: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  cameraBox: {
    flex: '1 1 480px',
    minWidth: '320px',
  },
  cameraWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4/3',
    background: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid #333',
    transition: 'border-color 0.1s',
  },
  cameraFlash: {
    borderColor: '#00ff88',
  },
  video: {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  canvas: {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    transform: 'scaleX(-1)',
  },
  status: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: '10px',
    fontSize: '14px',
  },
  error: {
    textAlign: 'center',
    color: '#ff5555',
    fontSize: '13px',
  },
  controlPanel: {
    flex: '1 1 380px',
    minWidth: '300px',
    background: '#13131f',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #2a2a3a',
  },
  letterTitle: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    color: '#ccc',
  },
  letterBig: {
    fontSize: '32px',
    color: '#ff6b00',
    fontWeight: 800,
  },
  count: {
    margin: '0 0 16px 0',
    fontSize: '13px',
    color: '#888',
  },
  alphabetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
    marginBottom: '20px',
  },
  letterBtn: {
    position: 'relative',
    background: '#1a1a2e',
    border: '1px solid #333',
    color: '#fff',
    padding: '10px 0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  letterBtnActive: {
    background: '#ff6b00',
    borderColor: '#ff6b00',
    color: '#000',
  },
  letterBtnHasData: {
    boxShadow: 'inset 0 -3px 0 #00ff88',
  },
  letterCount: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: '#00ff88',
    color: '#000',
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: '8px',
    padding: '1px 5px',
    minWidth: '14px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  recordBtn: {
    background: '#ff6b00',
    border: 'none',
    color: '#000',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700,
  },
  smallActions: {
    display: 'flex',
    gap: '8px',
  },
  smallBtn: {
    flex: 1,
    background: '#1a1a2e',
    border: '1px solid #333',
    color: '#ccc',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  dangerBtn: {
    color: '#ff5555',
    borderColor: '#552222',
  },
  exportBtn: {
    background: '#00aa66',
    border: 'none',
    color: '#fff',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
  },
  instructions: {
    borderTop: '1px solid #2a2a3a',
    paddingTop: '16px',
  },
  instrTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#ffaa00',
  },
  instrList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '12.5px',
    color: '#aaa',
    lineHeight: 1.7,
  },
};
