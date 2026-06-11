import React, { useRef, useEffect, useState } from 'react';
import { KNNClassifier, GestureSmoothing, loadTrainingData } from '../hooks/useKNNClassifier';

const smoother = new GestureSmoothing(15, 0.6);
let lastAddedLetter = null;
let lastAddTime = 0;
const ADD_COOLDOWN = 1500;
const CONFIDENCE_THRESHOLD = 0.5; // confiança mínima do k-NN para considerar válido

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
  const wh = '#ffffff';

  // ── Helper: dedo como retângulo arredondado, ancorado num ponto, com ângulo e comprimento ──
  // x,y = base do dedo (na palma) | angleDeg = 0° é para cima, 90° é para a direita
  // len = comprimento total | bend = 0 (reto) a 1 (totalmente dobrado/curvo)
  function Finger({ x, y, angleDeg, len = 32, w = 9, color = sk, bend = 0 }) {
    const rad = (angleDeg * Math.PI) / 180;
    if (bend < 0.05) {
      return (
        <rect x={x - w/2} y={y - len} width={w} height={len} rx={w/2}
          fill={color} stroke={sd} strokeWidth="1"
          transform={`rotate(${angleDeg} ${x} ${y})`}/>
      );
    }
    // dedo dobrado: desenha um arco curvo
    const curveLen = len * (1 - bend * 0.5);
    const dx = Math.sin(rad) * curveLen;
    const dy = -Math.cos(rad) * curveLen;
    const cx = x + dx * 0.3 + Math.cos(rad) * len * bend * 0.6;
    const cy = y + dy * 0.3 - Math.sin(rad) * len * bend * 0.6 * 0.3;
    return (
      <path d={`M${x-w/2} ${y} Q${cx} ${cy} ${x+dx} ${y+dy}`}
        fill="none" stroke={color} strokeWidth={w} strokeLinecap="round"/>
    );
  }

  // Palma base (forma genérica)
  const Palm = ({ cx = 40, cy = 56, rx = 20, ry = 19, fill = sk }) =>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={sd} strokeWidth="1.2"/>;

  const shapes = {

    // A — punho fechado, indicador a apontar para a frente (visto de lado, conta-a-mão)
    A: <g>
      <Palm cx={42} cy={48} rx={22} ry={18}/>
      <rect x="58" y="42" width="18" height="13" rx="6" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[26,34].map((y,i)=><rect key={i} x="22" y={y} width="14" height="11" rx="5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="34" cy="64" rx="12" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // B — joinha: punho fechado, polegar para cima
    B: <g>
      <rect x="22" y="42" width="38" height="30" rx="9" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[25,34,43,52].map((x,i)=><rect key={i} x={x} y={34} width="8" height={12} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="14" y="14" width="10" height="32" rx="5" fill={ac} stroke={sd} strokeWidth="1.2"/>
    </g>,

    // C — mão em garra/curva vista de lado
    C: <g>
      <path d="M65 22 Q34 14 22 36 Q14 54 26 66 Q40 76 64 70"
        fill="none" stroke={sd} strokeWidth="16" strokeLinecap="round"/>
      <path d="M65 22 Q34 14 22 36 Q14 54 26 66 Q40 76 64 70"
        fill="none" stroke={sk} strokeWidth="12" strokeLinecap="round"/>
      <path d="M22 36 Q26 30 34 30" fill="none" stroke={ac} strokeWidth="2" strokeDasharray="2 3" opacity="0.7"/>
    </g>,

    // D — mão aberta virada para baixo, dedos juntos a apontar para baixo (vista de cima)
    D: <g>
      <ellipse cx="40" cy="32" rx="22" ry="14" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[18,28,38,48,58].map((x,i)=>
        <rect key={i} x={x-5} y="34" width="10" height={28+(i===2?4:0)} rx="5" fill={sk} stroke={sd} strokeWidth="1"/>
      )}
    </g>,

    // E — mão aberta, dedos juntos verticais, polegar dobrado por baixo
    E: <g>
      <Palm cx={40} cy={56} rx={21} ry={19}/>
      {[19,28,40,52].map((x,i)=><rect key={i} x={x-4} y="14" width="8" height="42" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="38" cy="68" rx="14" ry="6" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // F — OK: polegar+indicador em círculo, restantes dedos dobrados/escondidos
    F: <g>
      <Palm cx={42} cy={56} rx={19} ry={18}/>
      <circle cx="32" cy="38" r="10" fill="none" stroke={ac} strokeWidth="7"/>
      <path d="M48 30 Q56 24 58 36 Q60 48 50 50" fill="none" stroke={sk} strokeWidth="9" strokeLinecap="round"/>
    </g>,

    // G — punho fechado visto de lado (perfil)
    G: <g>
      <ellipse cx="40" cy="48" rx="24" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[20,28,36,44].map((x,i)=><rect key={i} x={x} y="30" width="9" height="14" rx="4.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="56" cy="44" rx="9" ry="13" fill={sk} stroke={sd} strokeWidth="1"/>
      <path d="M22 36 L20 30" stroke={ac} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    </g>,

    // H — punho com indicador semi-levantado/dobrado
    H: <g>
      <ellipse cx="42" cy="56" rx="20" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <path d="M28 44 Q22 24 32 18 Q42 14 40 30 Q38 42 30 44" fill={ac} stroke={sd} strokeWidth="1.2"/>
      {[44,52].map((x,i)=><rect key={i} x={x} y="40" width="9" height="16" rx="4.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="22" cy="58" rx="6" ry="9" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // I — mão fechada com indicador+polegar formando "L" curvado tipo pistola
    I: <g>
      <ellipse cx="44" cy="58" rx="18" ry="16" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="34" y="14" width="9" height="46" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <path d="M30 50 Q14 50 14 38" fill="none" stroke={ac} strokeWidth="9" strokeLinecap="round"/>
      {[50,58].map((x,i)=><rect key={i} x={x} y="44" width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // J — "carate chop": mão vertical, dedos juntos espalmados
    J: <g>
      <rect x="26" y="14" width="36" height="56" rx="14" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[33,43,53].map((x,i)=><line key={i} x1={x} y1="20" x2={x} y2="64" stroke={sd} strokeWidth="1.2" opacity="0.5"/>)}
      <ellipse cx="22" cy="50" rx="9" ry="14" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // K — indicador a apontar para cima, restantes dobrados (visto de lado)
    K: <g>
      <ellipse cx="42" cy="56" rx="20" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="32" y="10" width="9" height="48" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      {[44,52,60].map((x,i)=><rect key={i} x={x} y="42" width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="22" cy="56" rx="6" ry="10" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // L — indicador dobrado em gancho, restantes fechados
    L: <g>
      <Palm cx={40} cy={55} rx={21} ry={19}/>
      <path d="M32 42 Q26 26 36 16 Q46 8 46 24 Q46 38 34 40" fill={ac} stroke={sd} strokeWidth="1.2"/>
      {[44,52,60].map((x,i)=><rect key={i} x={x} y={38+i*2} width="7" height="17" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="50" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // M — mão aberta, dedos curvados/relaxados a apontar para baixo
    M: <g>
      <Palm cx={40} cy={36} rx={22} ry={16}/>
      {[18,28,40,52,62].map((x,i)=>
        <path key={i} d={`M${x} 40 Q${x+2} 56 ${x-2} 70`}
          fill="none" stroke={i===2?ac:sk} strokeWidth="9" strokeLinecap="round"/>
      )}
    </g>,

    // N — mão com dedos curvados, indicador semi-dobrado
    N: <g>
      <Palm cx={40} cy={38} rx={21} ry={16}/>
      {[20,30,42,54].map((x,i)=>
        <path key={i} d={`M${x} 42 Q${x+2} 56 ${x-2} ${i===0? 64: 70}`}
          fill="none" stroke={i===0?ac:sk} strokeWidth="9" strokeLinecap="round"/>
      )}
    </g>,

    // O — polegar e indicador tocam-se em círculo pequeno, outros dedos fechados
    O: <g>
      <ellipse cx="40" cy="53" rx="21" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <circle cx="38" cy="36" r="9" fill="none" stroke={sd} strokeWidth="9"/>
      <circle cx="38" cy="36" r="9" fill="none" stroke={ac} strokeWidth="5"/>
    </g>,

    // P — mão aberta achatada, dedos juntos, a apontar para o lado
    P: <g>
      <ellipse cx="34" cy="50" rx="16" ry="14" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[36,44,52,60].map((x,i)=><rect key={i} x={x} y="44" width="9" height="12" rx="4.5" fill={i===1?ac:sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="24" cy="62" rx="9" ry="7" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // Q — mão fechada com dedos curvados para baixo
    Q: <g>
      <Palm cx={40} cy={40} rx={20} ry={17}/>
      {[24,32,40,48].map((x,i)=>
        <path key={i} d={`M${x} 44 Q${x+1} 56 ${x-1} 66`}
          fill="none" stroke={ac} strokeWidth="8" strokeLinecap="round"/>
      )}
      <ellipse cx="56" cy="46" rx="8" ry="12" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // R — indicador inclinado para a frente, médio reto, polegar a apoiar o indicador
    R: <g>
      <ellipse cx="40" cy="58" rx="19" ry="16" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="26" y="16" width="9" height="44" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(18 30 38)"/>
      <rect x="38" y="12" width="9" height="46" rx="4.5" fill={sk} stroke={sd} strokeWidth="1"/>
      <ellipse cx="22" cy="46" rx="6" ry="10" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(35 22 46)"/>
      {[51,59].map((x,i)=><rect key={i} x={x} y="42" width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // S — punho fechado simples
    S: <g>
      <rect x="20" y="34" width="42" height="34" rx="9" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[23,32,41,50].map((x,i)=><rect key={i} x={x} y="24" width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="20" cy="48" rx="9" ry="13" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // T — indicador a apontar para o lado, restantes fechados
    T: <g>
      <ellipse cx="44" cy="56" rx="18" ry="17" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="6" y="38" width="38" height="9" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      {[46,54,61].map((x,i)=><rect key={i} x={x} y="48" width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="46" cy="68" rx="9" ry="6" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // U — indicador + médio juntos, a apontar para o lado/frente
    U: <g>
      <ellipse cx="46" cy="56" rx="17" ry="17" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="6" y="36" width="40" height="9" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="6" y="47" width="40" height="9" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      {[50,58].map((x,i)=><rect key={i} x={x} y="50" width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // V — indicador e médio em V, virados para cima
    V: <g>
      <ellipse cx="40" cy="58" rx="19" ry="16" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="22" y="12" width="9" height="46" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-12 26 50)"/>
      <rect x="44" y="12" width="9" height="46" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(12 48 50)"/>
      {[54,62].map((x,i)=><rect key={i} x={x} y="44" width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="16" cy="54" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // W — 3 dedos (indicador, médio, anelar) espalhados para cima
    W: <g>
      <ellipse cx="40" cy="60" rx="21" ry="15" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="16" y="14" width="8" height="46" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-10 20 52)"/>
      <rect x="32" y="10" width="9" height="50" rx="4.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="48" y="14" width="8" height="46" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(10 52 52)"/>
      <rect x="60" y="38" width="7" height="22" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>
      <ellipse cx="11" cy="56" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // X — indicador + médio entrelaçados/cruzados, ambos para cima
    X: <g>
      <ellipse cx="40" cy="58" rx="19" ry="16" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="30" y="12" width="9" height="46" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(10 34 38)"/>
      <rect x="38" y="12" width="9" height="46" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-10 42 38)"/>
      <circle cx="38" cy="34" r="3" fill={sd} opacity="0.5"/>
      {[51,59].map((x,i)=><rect key={i} x={x} y="44" width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="54" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // Y — polegar + mindinho estendidos (shaka), virado para baixo
    Y: <g>
      <ellipse cx="40" cy="46" rx="19" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[28,36,44].map((x,i)=><rect key={i} x={x} y="48" width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="54" y="44" width="9" height="34" rx="4.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(15 58 60)"/>
      <rect x="14" y="46" width="10" height="32" rx="5" fill={ac} stroke={sd} strokeWidth="1.2" transform="rotate(-15 19 60)"/>
    </g>,

    // Z — mão fechada de lado, com a letra Z desenhada na palma
    Z: <g>
      <rect x="20" y="30" width="44" height="38" rx="10" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[24,33,42,51].map((x,i)=><rect key={i} x={x} y="20" width="8" height="14" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <path d="M30 40 L52 40 L30 60 L52 60" fill="none" stroke={ac} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
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
  const [trainingCount, setTrainingCount] = useState(0);

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

  // ── Carregar dados de treino e construir o classificador k-NN ────────────
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
              <span style={s.statusTxt}>
                {trainingCount === 0
                  ? '⚠️ Sem dados de treino — vai a /lgp-training-data.json'
                  : status}
              </span>
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
