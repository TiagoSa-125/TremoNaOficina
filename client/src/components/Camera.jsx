import React, { useRef, useEffect, useState } from 'react';
import { KNNClassifier, GestureSmoothing, loadTrainingData } from '../hooks/useKNNClassifier';

const smoother = new GestureSmoothing(15, 0.6);
let lastAddedLetter = null;
let lastAddTime = 0;
const ADD_COOLDOWN = 1500;
const CONFIDENCE_THRESHOLD = 0.5;

// ─── Alfabeto LGP (APS) ───────────────────────────────────────────────────────
const LGP_ALPHABET = [
  { letter:'A', desc:'Punho fechado, polegar encostado ao lado do indicador' },
  { letter:'B', desc:'Punho fechado, só o polegar levantado para cima (joinha)' },
  { letter:'C', desc:'Todos os dedos semi-curvados formando um C, polegar em oposição' },
  { letter:'D', desc:'Indicador levantado, polegar encosta na ponta/base do médio dobrado' },
  { letter:'E', desc:'Todos os dedos dobrados em garra para a palma' },
  { letter:'F', desc:'Polegar + indicador em círculo (OK), médio, anelar e mindinho estendidos' },
  { letter:'G', desc:'Indicador apontado para o lado, polegar paralelo' },
  { letter:'H', desc:'Indicador + médio estendidos horizontalmente para o lado' },
  { letter:'I', desc:'Só o mindinho estendido para cima, polegar e outros dedos fechados' },
  { letter:'J', desc:'Polegar + mindinho estendidos (shaka / telefone), 3 do meio fechados' },
  { letter:'K', desc:'Indicador para cima, médio oblíquo para o lado, polegar entre os dois' },
  { letter:'L', desc:'Indicador para cima + polegar para o lado — forma de L' },
  { letter:'M', desc:'Indicador, médio e anelar dobrados sobre o polegar' },
  { letter:'N', desc:'Indicador e médio dobrados sobre o polegar' },
  { letter:'O', desc:'Todos os dedos curvados a tocar no polegar — forma de O' },
  { letter:'P', desc:'Mão inclinada, indicador aponta para baixo, polegar para o lado' },
  { letter:'Q', desc:'Indicador + polegar apontam para baixo juntos — pinça para baixo' },
  { letter:'R', desc:'Indicador + médio cruzados/entrelaçados e estendidos para cima' },
  { letter:'S', desc:'Punho fechado, polegar dobrado por cima dos outros dedos' },
  { letter:'T', desc:'Punho fechado, polegar espetado entre o indicador e o médio' },
  { letter:'U', desc:'Indicador + médio juntos e estendidos para cima (sem separação)' },
  { letter:'V', desc:'Indicador + médio estendidos em V aberto (tesoura / paz)' },
  { letter:'W', desc:'Indicador, médio e anelar estendidos e separados — forma de W' },
  { letter:'X', desc:'Indicador dobrado em gancho, restantes fechados' },
  { letter:'Y', desc:'Polegar + mindinho estendidos (shaka), 3 do meio fechados' },
  { letter:'Z', desc:'Indicador estendido para cima, faz o traço do Z no ar' },
];

// ─── Posições de cada letra na imagem sprite da APS ─────────────────────────
// Imagem: 753x1024px | Grid: 6 colunas x 5 linhas | Topo da grelha: 118px
// Cada célula: ~125.5 x 181.2 px
// A imagem deve estar em /public/lgp-alfabeto.png
const SPRITE_IMG = '/lgp-alfabeto.png';
const CELL_W = 125.5;
const CELL_H = 181.2;
const GRID_TOP = 118;
const COLS = 6;

function getLetterPos(letter) {
  const idx = letter.charCodeAt(0) - 65; // A=0, B=1, ...
  const col = idx % COLS;
  const row = Math.floor(idx / COLS);
  const x = col * CELL_W;
  const y = GRID_TOP + row * CELL_H;
  return { x, y };
}

// ─── Componente de foto da letra APS ─────────────────────────────────────────
// Usa CSS background-position para recortar a célula certa do sprite
function LetterPhoto({ letter, size = 90, highlight = false }) {
  const { x, y } = getLetterPos(letter);
  // Escala para o tamanho pedido
  const scale = size / CELL_W;
  const bgW = 753 * scale;
  const bgH = 1024 * scale;
  const bgX = -x * scale;
  const bgY = -y * scale;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundImage: `url(${SPRITE_IMG})`,
      backgroundSize: `${bgW.toFixed(1)}px ${bgH.toFixed(1)}px`,
      backgroundPosition: `${bgX.toFixed(1)}px ${bgY.toFixed(1)}px`,
      backgroundRepeat: 'no-repeat',
      border: highlight ? '2px solid #ff6b00' : '2px solid transparent',
      boxShadow: highlight ? '0 0 8px rgba(255,107,0,0.7)' : 'none',
      flexShrink: 0,
    }} />
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Camera({ onLetterDetected, active, currentGuessLength, wordLength }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const activeRef = useRef(active);
  const currentGuessLengthRef = useRef(currentGuessLength);
  const wordLengthRef = useRef(wordLength);
  const onLetterDetectedRef = useRef(onLetterDetected);

  const [status, setStatus]                 = useState('A iniciar câmara...');
  const [detectedLetter, setDetectedLetter] = useState(null);
  const [progress, setProgress]             = useState(0);
  const [error, setError]                   = useState(null);
  const [panelOpen, setPanelOpen]           = useState(false);
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [searchLetter, setSearchLetter]     = useState('');
  const [trainingCount, setTrainingCount]   = useState(0);

  const classifierRef = useRef(null);

  const filtered = LGP_ALPHABET.filter(i =>
    searchLetter === '' || i.letter === searchLetter.toUpperCase()
  );
  const selectedData = LGP_ALPHABET.find(l => l.letter === selectedLetter) || LGP_ALPHABET[0];

  useEffect(() => {
    activeRef.current = active;
    currentGuessLengthRef.current = currentGuessLength;
    wordLengthRef.current = wordLength;
    onLetterDetectedRef.current = onLetterDetected;
  }, [active, currentGuessLength, wordLength, onLetterDetected]);

  useEffect(() => {
    let mounted = true;
    loadTrainingData().then(data => {
      if (!mounted) return;
      classifierRef.current = new KNNClassifier(data, 5, 1.4);
      setTrainingCount(data.length);
    });
    return () => { mounted = false; };
  }, []);

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

            let raw = null;
            if (classifierRef.current && classifierRef.current.size > 0) {
              const { letter: predicted, confidence } = classifierRef.current.predict(lm);
              raw = confidence >= CONFIDENCE_THRESHOLD ? predicted : null;
            }
            const { letter, progress: prog } = smoother.update(raw);
            setDetectedLetter(letter);
            setProgress(prog);
            if (letter) setSelectedLetter(letter);

            if (
              smoother.isConfirmed() &&
              letter &&
              activeRef.current &&
              currentGuessLengthRef.current < wordLengthRef.current
            ) {
              const now = Date.now();
              if (letter !== lastAddedLetter || now - lastAddTime > ADD_COOLDOWN) {
                lastAddedLetter = letter;
                lastAddTime = now;
                onLetterDetectedRef.current(letter);
                smoother.reset();
                setProgress(0);
              }
            }
            setStatus('Mão detetada ✋');
          } else {
            smoother.reset();
            setDetectedLetter(null);
            setProgress(0);
            setStatus('Mostra a mão à câmara');
          }
        });

        handsRef.current = hands;

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('O browser não permite câmara neste endereço. Usa HTTPS ou localhost.');
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
        if (!mounted) return;
        console.error('Erro câmara:', err);
        if (err.name === 'NotAllowedError') {
          setError('Câmara bloqueada. Permite o acesso nas definições do browser.');
        } else {
          setError(`Erro ao iniciar câmara: ${err.message}`);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      handsRef.current?.close?.();
      videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrapper}>
      <style>{`
        @keyframes slidePanel { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,107,0,.5)} 50%{box-shadow:0 0 0 5px rgba(255,107,0,0)} }
        .lc:hover{border-color:#ff6b00!important;transform:scale(1.06);background:rgba(255,107,0,.12)!important}
        .lc{transition:all .12s ease;cursor:pointer}
      `}</style>

      {error
        ? <div style={s.error}><span style={{fontSize:'2rem'}}>⚠️</span><p>{error}</p></div>
        : <>
          <div style={s.camArea}>
            <video ref={videoRef} style={{...s.video, transform:'scaleX(-1)'}} playsInline muted />
            <canvas ref={canvasRef} width={640} height={480} style={{...s.canvas, transform:'scaleX(-1)'}} />

            {detectedLetter && (
              <div style={s.detBox}>
                <span style={s.detLetter}>{detectedLetter}</span>
                <div style={s.bar}><div style={{...s.barFill, width:`${progress*100}%`}}/></div>
              </div>
            )}

            <div style={s.status}>
              <span style={{...s.dot, background: detectedLetter ? '#ff6b00' : '#39ff14'}}/>
              <span style={s.statusTxt}>
                {trainingCount === 0
                  ? '⚠️ Sem dados de treino — vai a /lgp-training-data.json'
                  : status}
              </span>
            </div>

            {/* Botão toggle painel alfabeto */}
            <button
              style={{...s.toggleBtn, background: panelOpen ? 'rgba(255,107,0,.92)' : 'rgba(0,0,0,.78)'}}
              onClick={() => setPanelOpen(p => !p)}
            >
              {panelOpen ? '✕ Fechar' : '🖐 Alfabeto LGP'}
            </button>

            {/* Painel alfabeto com fotos reais APS */}
            {panelOpen && (
              <div style={s.panel}>
                {/* Cabeçalho */}
                <div style={s.panelHead}>
                  <span style={s.panelTitle}>Alfabeto Oficial LGP</span>
                  <input
                    style={s.search}
                    placeholder="A…"
                    value={searchLetter}
                    onChange={e => setSearchLetter(e.target.value)}
                    maxLength={1}
                  />
                </div>

                {/* Grelha de letras */}
                <div style={s.grid}>
                  {filtered.map(({letter}) => {
                    const isDetected = detectedLetter === letter;
                    const isSelected = selectedLetter === letter;
                    return (
                      <div key={letter} className="lc"
                        style={{
                          ...s.chip,
                          background: isDetected
                            ? 'rgba(255,107,0,.3)'
                            : isSelected
                            ? 'rgba(255,170,0,.15)'
                            : 'rgba(10,10,15,.85)',
                          border: `1px solid ${isDetected ? '#ff6b00' : isSelected ? '#ffaa00' : 'rgba(42,42,62,.8)'}`,
                          color: isDetected ? '#ff6b00' : isSelected ? '#ffaa00' : '#aaa',
                          animation: isDetected ? 'pulse .7s ease infinite' : 'none',
                        }}
                        onClick={() => setSelectedLetter(letter)}
                      >{letter}</div>
                    );
                  })}
                </div>

                {/* Detalhe: foto real + descrição */}
                <div style={s.detail} key={selectedData.letter}>
                  <LetterPhoto
                    letter={selectedData.letter}
                    size={88}
                    highlight={detectedLetter === selectedData.letter}
                  />
                  <div style={s.detailText}>
                    <span style={s.detailLetter}>{selectedData.letter}</span>
                    <span style={s.detailDesc}>{selectedData.desc}</span>
                    {detectedLetter === selectedData.letter &&
                      <span style={s.detailOk}>✅ Correto!</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={s.hint}>
            {active && currentGuessLength < wordLength
              ? '🖐 Mantém o gesto até a barra encher'
              : active && currentGuessLength >= wordLength
              ? '✅ Palavra completa! Pressiona CONFIRMAR'
              : '❌ Jogo terminado'}
          </div>
        </>
      }
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  wrapper:  { display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', width:'100%' },
  camArea:  { position:'relative', width:'100%', maxWidth:'440px', aspectRatio:'4/3',
              borderRadius:'10px', overflow:'hidden', border:'2px solid #ff6b00',
              boxShadow:'0 0 24px rgba(255,107,0,.25)', background:'#000' },
  video:    { position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' },
  canvas:   { position:'absolute', inset:0, width:'100%', height:'100%' },

  detBox:   { position:'absolute', top:'10px', left:'10px', background:'rgba(0,0,0,.88)',
              border:'2px solid #ff6b00', borderRadius:'8px', padding:'6px 10px',
              textAlign:'center', minWidth:'52px', zIndex:10 },
  detLetter:{ fontFamily:'Black Ops One,cursive', fontSize:'2.2rem', color:'#ff6b00', display:'block', lineHeight:1 },
  bar:      { height:'4px', background:'#2a2a3e', borderRadius:'2px', marginTop:'4px', overflow:'hidden' },
  barFill:  { height:'100%', background:'linear-gradient(90deg,#ff6b00,#39ff14)', borderRadius:'2px', transition:'width .1s linear' },

  status:   { position:'absolute', bottom:'8px', left:'50%', transform:'translateX(-50%)',
              display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,.72)',
              padding:'4px 12px', borderRadius:'20px', backdropFilter:'blur(4px)', zIndex:10, whiteSpace:'nowrap' },
  dot:      { width:'6px', height:'6px', borderRadius:'50%', flexShrink:0 },
  statusTxt:{ fontFamily:'Share Tech Mono,monospace', fontSize:'0.68rem', color:'#e8e8f0' },

  toggleBtn:{ position:'absolute', top:'10px', right:'10px', zIndex:20,
              border:'1px solid rgba(255,107,0,.6)', borderRadius:'20px', color:'#fff',
              fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:'0.78rem',
              padding:'5px 10px', cursor:'pointer', backdropFilter:'blur(4px)', transition:'background .2s' },

  panel:    { position:'absolute', top:0, right:0, bottom:0, width:'210px',
              background:'rgba(8,8,14,.95)', backdropFilter:'blur(10px)',
              borderLeft:'1px solid rgba(255,107,0,.25)', zIndex:15,
              display:'flex', flexDirection:'column', padding:'8px', gap:'8px',
              animation:'slidePanel .2s ease', overflowY:'auto' },
  panelHead:{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'36px' },
  panelTitle:{ fontFamily:'Black Ops One,cursive', fontSize:'0.7rem', color:'#ff6b00', letterSpacing:'0.04em' },
  search:   { width:'34px', padding:'3px 4px', background:'rgba(42,42,62,.9)',
              border:'1px solid #3a3a5c', borderRadius:'4px', color:'#e8e8f0',
              fontFamily:'Share Tech Mono,monospace', fontSize:'0.8rem',
              textTransform:'uppercase', outline:'none', textAlign:'center' },

  grid:     { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'3px' },
  chip:     { padding:'5px 2px', borderRadius:'4px', textAlign:'center',
              fontFamily:'Black Ops One,cursive', fontSize:'0.85rem', userSelect:'none' },

  detail:   { display:'flex', alignItems:'center', gap:'8px',
              background:'rgba(255,107,0,.07)', border:'1px solid rgba(255,107,0,.22)',
              borderRadius:'8px', padding:'8px' },
  detailText:{ display:'flex', flexDirection:'column', gap:'3px', flex:1, minWidth:0 },
  detailLetter:{ fontFamily:'Black Ops One,cursive', fontSize:'1.8rem', color:'#ff6b00', lineHeight:1 },
  detailDesc:{ fontFamily:'Share Tech Mono,monospace', fontSize:'0.55rem', color:'#8888aa', lineHeight:1.35, wordBreak:'break-word' },
  detailOk: { fontFamily:'Share Tech Mono,monospace', fontSize:'0.6rem', color:'#39ff14', marginTop:'2px' },

  hint:     { fontFamily:'Share Tech Mono,monospace', fontSize:'0.72rem', color:'#55557a', textAlign:'center' },
  error:    { display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', padding:'24px',
              background:'#12121a', border:'2px solid #ff2244', borderRadius:'8px',
              color:'#ff2244', fontFamily:'Share Tech Mono,monospace', fontSize:'0.85rem',
              textAlign:'center', maxWidth:'300px' },
};