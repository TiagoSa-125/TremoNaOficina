import React, { useRef, useEffect, useState } from 'react';
import { detectLGPLetter, GestureSmoothing } from '../hooks/useGestureDetection';

const smoother = new GestureSmoothing(15, 0.6);
let lastAddedLetter = null;
let lastAddTime = 0;
const ADD_COOLDOWN = 1500;

// ─── Alfabeto LGP oficial (APS) ───────────────────────────────────────────────
const LGP_ALPHABET = [
  { letter:'A', desc:'Punho fechado, polegar encostado ao lado do indicador' },
  { letter:'B', desc:'Punho fechado, só o polegar levantado para cima (joinha)' },
  { letter:'C', desc:'Todos os dedos semi-curvados formando um C, polegar em oposição' },
  { letter:'D', desc:'Indicador levantado, polegar encosta na ponta/base do médio dobrado' },
  { letter:'E', desc:'Todos os dedos dobrados em garra para a palma' },
  { letter:'F', desc:'Polegar + indicador em círculo (OK), médio, anelar e mindinho estendidos' },
  { letter:'G', desc:'Indicador apontado para o lado, polegar paralelo — forma de pistola deitada' },
  { letter:'H', desc:'Indicador + médio estendidos e apontados horizontalmente para o lado' },
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

// ─── SVGs baseados na imagem oficial APS ─────────────────────────────────────
function HandSVG({ letter, highlight }) {
  const sk = '#f0c090';
  const sd = '#d4956a';
  const ac = highlight ? '#ff6b00' : '#ffaa00';

  const shapes = {

    // A — punho fechado, polegar ao lado do indicador
    A: <g>
      <rect x="20" y="34" width="40" height="32" rx="9" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[23,31,40,49].map((x,i)=><rect key={i} x={x} y={22} width="9" height={16} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="13" y="38" width="10" height="16" rx="5" fill={sk} stroke={sd} strokeWidth="1.2"/>
    </g>,

    // B — joinha: punho fechado, só polegar para cima
    B: <g>
      <rect x="22" y="42" width="38" height="30" rx="9" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[25,34,43,52].map((x,i)=><rect key={i} x={x} y={34} width="8" height={12} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="14" y="14" width="10" height="32" rx="5" fill={ac} stroke={sd} strokeWidth="1.2"/>
    </g>,

    // C — mão em arco de C
    C: <g>
      <path d="M65 18 Q30 8 18 38 Q10 58 26 70 Q42 80 65 72"
        fill="none" stroke={sd} strokeWidth="15" strokeLinecap="round"/>
      <path d="M65 18 Q30 8 18 38 Q10 58 26 70 Q42 80 65 72"
        fill="none" stroke={sk} strokeWidth="11" strokeLinecap="round"/>
      <path d="M65 18 Q30 8 18 38 Q10 58 26 70 Q42 80 65 72"
        fill="none" stroke={ac} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" opacity="0.7"/>
    </g>,

    // D — indicador levantado, polegar toca no médio dobrado
    D: <g>
      <ellipse cx="42" cy="55" rx="20" ry="19" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="28" y="14" width="9" height="40" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      {[38,47,55].map((x,i)=><rect key={i} x={x} y={36+i*3} width="8" height={18-i*3} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="20" cy="48" rx="6" ry="10" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(25 20 48)"/>
    </g>,

    // E — garra: todos os dedos dobrados para a palma
    E: <g>
      <ellipse cx="40" cy="55" rx="21" ry="19" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[[24,26],[33,24],[42,25],[51,28]].map(([x,y],i)=>
        <path key={i} d={`M${x} ${y} Q${x} ${y+14} ${x+5} ${y+20}`}
          fill="none" stroke={ac} strokeWidth="8" strokeLinecap="round"/>
      )}
      <ellipse cx="18" cy="50" rx="6" ry="9" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(20 18 50)"/>
    </g>,

    // F — OK: polegar+indicador em círculo, 3 dedos estendidos
    F: <g>
      <ellipse cx="42" cy="56" rx="19" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <circle cx="30" cy="40" r="9" fill="none" stroke={ac} strokeWidth="6"/>
      {[41,50,58].map((x,i)=><rect key={i} x={x} y={12+i*4} width="8" height={40-i*4} rx="4" fill={ac} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // G — indicador horizontal para o lado, polegar paralelo
    G: <g>
      <ellipse cx="44" cy="54" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="10" y="34" width="38" height="9" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="10" y="46" width="20" height="8" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      {[44,52,59].map((x,i)=><rect key={i} x={x} y={38} width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // H — indicador + médio horizontais paralelos
    H: <g>
      <ellipse cx="44" cy="54" rx="18" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="10" y="30" width="38" height="9" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="10" y="42" width="38" height="9" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      {[50,58].map((x,i)=><rect key={i} x={x} y={36} width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // I — só mindinho estendido
    I: <g>
      <ellipse cx="40" cy="55" rx="21" ry="19" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[20,29,38].map((x,i)=><rect key={i} x={x} y={38} width="8" height="15" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="50" y="14" width="9" height="40" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="16" y="40" width="8" height="13" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // J — shaka: polegar + mindinho abertos
    J: <g>
      <ellipse cx="40" cy="54" rx="20" ry="19" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[28,37,46].map((x,i)=><rect key={i} x={x} y={38} width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="56" y="14" width="9" height="38" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="12" y="12" width="10" height="36" rx="5" fill={ac} stroke={sd} strokeWidth="1.2" transform="rotate(-15 17 30)"/>
    </g>,

    // K — indicador cima, médio oblíquo, polegar no meio
    K: <g>
      <ellipse cx="42" cy="57" rx="19" ry="17" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="26" y="12" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="36" y="22" width="8" height="34" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(22 40 38)"/>
      {[51,59].map((x,i)=><rect key={i} x={x} y={40+i*2} width="7" height="15" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="20" cy="42" rx="6" ry="10" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(18 20 42)"/>
    </g>,

    // L — indicador para cima, polegar para o lado: forma de L
    L: <g>
      <ellipse cx="43" cy="56" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="32" y="10" width="9" height="46" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="10" y="50" width="28" height="9" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      {[43,51].map((x,i)=><rect key={i} x={x} y={38+i*3} width="8" height="18" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // M — 3 dedos (ind+med+anel) dobrados sobre o polegar
    M: <g>
      <ellipse cx="40" cy="53" rx="22" ry="21" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[22,31,40].map((x,i)=><rect key={i} x={x} y={32} width="8" height="20" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>)}
      <rect x="50" y="38" width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>
      <ellipse cx="18" cy="46" rx="7" ry="10" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(28 18 46)"/>
      <ellipse cx="34" cy="52" rx="14" ry="4" fill={sd} opacity="0.25"/>
    </g>,

    // N — ind+médio dobrados sobre polegar
    N: <g>
      <ellipse cx="40" cy="53" rx="22" ry="21" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[24,33].map((x,i)=><rect key={i} x={x} y={32} width="8" height="20" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>)}
      {[43,52].map((x,i)=><rect key={i} x={x} y={38} width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="46" rx="7" ry="10" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(28 18 46)"/>
    </g>,

    // O — todos os dedos formam um O com o polegar
    O: <g>
      <ellipse cx="40" cy="53" rx="21" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <ellipse cx="38" cy="35" rx="13" ry="15" fill="none" stroke={sd} strokeWidth="11"/>
      <ellipse cx="38" cy="35" rx="13" ry="15" fill="none" stroke={sk} strokeWidth="7"/>
      <ellipse cx="38" cy="35" rx="13" ry="15" fill="none" stroke={ac} strokeWidth="2" strokeDasharray="3 3" opacity="0.8"/>
    </g>,

    // P — mão inclinada, indicador para baixo, polegar para o lado
    P: <g>
      <ellipse cx="40" cy="42" rx="19" ry="19" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="30" y="42" width="9" height="30" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="13" y="38" width="22" height="8" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      {[41,50].map((x,i)=><rect key={i} x={x} y={34} width="8" height="16" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // Q — pinça para baixo: indicador+polegar apontam para baixo
    Q: <g>
      <ellipse cx="40" cy="42" rx="19" ry="19" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="32" y="42" width="9" height="28" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="20" y="44" width="14" height="8" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(15 27 48)"/>
      {[43,52].map((x,i)=><rect key={i} x={x} y={34} width="8" height="16" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // R — indicador + médio cruzados para cima
    R: <g>
      <ellipse cx="40" cy="57" rx="19" ry="17" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="28" y="12" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(7 32 38)"/>
      <rect x="38" y="12" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-7 42 38)"/>
      {[51,59].map((x,i)=><rect key={i} x={x} y={40} width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // S — punho fechado, polegar por cima dos dedos
    S: <g>
      <rect x="20" y="34" width="42" height="34" rx="9" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[23,32,41,50].map((x,i)=><rect key={i} x={x} y={24} width="8" height={14} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="18" y="28" width="30" height="10" rx="5" fill={ac} stroke={sd} strokeWidth="1.2"/>
    </g>,

    // T — punho, polegar espetado entre indicador e médio
    T: <g>
      <rect x="20" y="34" width="42" height="34" rx="9" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[23,32,41,50].map((x,i)=><rect key={i} x={x} y={24} width="8" height={14} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="32" cy="30" rx="6" ry="8" fill={ac} stroke={sd} strokeWidth="1.2"/>
    </g>,

    // U — indicador + médio juntos para cima (sem separação)
    U: <g>
      <ellipse cx="40" cy="57" rx="19" ry="17" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="27" y="12" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="37" y="12" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      {[48,56].map((x,i)=><rect key={i} x={x} y={40} width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // V — indicador + médio em V aberto (tesoura)
    V: <g>
      <ellipse cx="40" cy="57" rx="19" ry="17" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="22" y="12" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-10 26 50)"/>
      <rect x="43" y="12" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(10 47 50)"/>
      {[52,60].map((x,i)=><rect key={i} x={x} y={40} width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="16" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // W — 3 dedos estendidos e separados
    W: <g>
      <ellipse cx="40" cy="58" rx="21" ry="16" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="18" y="12" width="8" height="44" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-8 22 50)"/>
      <rect x="32" y="10" width="9" height="46" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="46" y="12" width="8" height="44" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(8 50 50)"/>
      <rect x="57" y="34" width="7" height="22" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>
      <ellipse cx="13" cy="53" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // X — indicador dobrado em gancho
    X: <g>
      <ellipse cx="40" cy="55" rx="21" ry="19" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <path d="M32 42 Q28 28 34 18 Q42 10 44 24 Q46 38 34 42" fill={ac} stroke={sd} strokeWidth="1.2"/>
      {[44,52,60].map((x,i)=><rect key={i} x={x} y={38+i*2} width="7" height="17" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="50" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // Y — polegar + mindinho abertos (shaka)
    Y: <g>
      <ellipse cx="40" cy="54" rx="19" ry="19" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[28,36,44].map((x,i)=><rect key={i} x={x} y={38} width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="54" y="12" width="9" height="40" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="12" y="12" width="10" height="38" rx="5" fill={ac} stroke={sd} strokeWidth="1.2" transform="rotate(-18 17 30)"/>
    </g>,

    // Z — indicador estendido para cima (traça Z no ar)
    Z: <g>
      <ellipse cx="40" cy="57" rx="19" ry="17" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="30" y="12" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      {[41,50,58].map((x,i)=><rect key={i} x={x} y={40+i*2} width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
      <path d="M44 16 L58 16 L44 28 L58 28" fill="none" stroke={ac} strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>
    </g>,
  };

  const fallback = (
    <g>
      <ellipse cx="40" cy="50" rx="20" ry="24" fill={sk} stroke={sd} strokeWidth="1.5"/>
      <text x="40" y="56" textAnchor="middle" fontSize="22" fontWeight="bold" fill={ac} fontFamily="monospace">{letter}</text>
    </g>
  );

  return (
    <svg width="80" height="80" viewBox="0 0 80 80"
      style={{ filter: highlight ? 'drop-shadow(0 0 6px #ff6b00)' : 'none', flexShrink: 0 }}>
      {shapes[letter] || fallback}
    </svg>
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

  const [status, setStatus]               = useState('A iniciar câmara...');
  const [detectedLetter, setDetectedLetter] = useState(null);
  const [progress, setProgress]           = useState(0);
  const [error, setError]                 = useState(null);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [searchLetter, setSearchLetter]   = useState('');

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

    const init = async () => {
      try {
        // Import dinâmico dos pacotes npm locais (sem CDN)
        const { Hands, HAND_CONNECTIONS } = await import('@mediapipe/hands');
        const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

        const hands = new Hands({
          locateFile: f => `/mediapipe/hands/${f}`,
        });

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

            const raw = detectLGPLetter(lm);
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

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrapper}>
      <style>{`
        @keyframes slidePanel { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,107,0,.5)} 50%{box-shadow:0 0 0 5px rgba(255,107,0,0)} }
        .lc:hover{border-color:#ff6b00!important;transform:scale(1.08);background:rgba(255,107,0,.12)!important}
        .lc{transition:all .12s ease;cursor:pointer}
      `}</style>

      {error
        ? <div style={s.error}><span style={{fontSize:'2rem'}}>⚠️</span><p>{error}</p></div>
        : <>
          <div style={s.camArea}>
            {/* Vídeo + canvas */}
            <video ref={videoRef} style={{...s.video, transform:'scaleX(-1)'}} playsInline muted />
            <canvas ref={canvasRef} width={640} height={480} style={{...s.canvas, transform:'scaleX(-1)'}} />

            {/* Letra detetada */}
            {detectedLetter && (
              <div style={s.detBox}>
                <span style={s.detLetter}>{detectedLetter}</span>
                <div style={s.bar}><div style={{...s.barFill, width:`${progress*100}%`}}/></div>
              </div>
            )}

            {/* Status */}
            <div style={s.status}>
              <span style={{...s.dot, background: detectedLetter ? '#ff6b00' : '#39ff14'}}/>
              <span style={s.statusTxt}>{status}</span>
            </div>

            {/* Botão toggle painel */}
            <button
              style={{...s.toggleBtn, background: panelOpen ? 'rgba(255,107,0,.92)' : 'rgba(0,0,0,.78)'}}
              onClick={() => setPanelOpen(p => !p)}
            >
              {panelOpen ? '✕ Fechar' : '🖐 Alfabeto LGP'}
            </button>

            {/* ── PAINEL ALFABETO ── */}
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
                    const isDetected  = detectedLetter === letter;
                    const isSelected  = selectedLetter === letter;
                    return (
                      <div key={letter} className="lc"
                        style={{
                          ...s.chip,
                          background: isDetected ? 'rgba(255,107,0,.3)' : isSelected ? 'rgba(255,170,0,.15)' : 'rgba(10,10,15,.85)',
                          border: `1px solid ${isDetected ? '#ff6b00' : isSelected ? '#ffaa00' : 'rgba(42,42,62,.8)'}`,
                          color:  isDetected ? '#ff6b00' : isSelected ? '#ffaa00' : '#aaa',
                          animation: isDetected ? 'pulse .7s ease infinite' : 'none',
                        }}
                        onClick={() => setSelectedLetter(letter)}
                      >{letter}</div>
                    );
                  })}
                </div>

                {/* Detalhe da letra selecionada */}
                <div style={s.detail} key={selectedData.letter}>
                  <HandSVG letter={selectedData.letter} highlight={detectedLetter === selectedData.letter} />
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

          {/* Dica */}
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

  panel:    { position:'absolute', top:0, right:0, bottom:0, width:'200px',
              background:'rgba(8,8,14,.93)', backdropFilter:'blur(10px)',
              borderLeft:'1px solid rgba(255,107,0,.25)', zIndex:15,
              display:'flex', flexDirection:'column', padding:'8px', gap:'8px',
              animation:'slidePanel .2s ease', overflowY:'auto' },
  panelHead:{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'34px' },
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
  detailDesc:{ fontFamily:'Share Tech Mono,monospace', fontSize:'0.58rem', color:'#8888aa', lineHeight:1.35, wordBreak:'break-word' },
  detailOk: { fontFamily:'Share Tech Mono,monospace', fontSize:'0.6rem', color:'#39ff14', marginTop:'2px' },

  hint:     { fontFamily:'Share Tech Mono,monospace', fontSize:'0.72rem', color:'#55557a', textAlign:'center' },
  error:    { display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', padding:'24px',
              background:'#12121a', border:'2px solid #ff2244', borderRadius:'8px',
              color:'#ff2244', fontFamily:'Share Tech Mono,monospace', fontSize:'0.85rem',
              textAlign:'center', maxWidth:'300px' },
};
