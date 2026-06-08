import React, { useRef, useEffect, useState } from 'react';
import { detectLGPLetter, GestureSmoothing } from '../hooks/useGestureDetection';

const smoother = new GestureSmoothing(15, 0.6);
let lastAddedLetter = null;
let lastAddTime = 0;
const ADD_COOLDOWN = 1500;

// ─── Alfabeto LGP oficial (APS) ───────────────────────────────────────────────
const LGP_ALPHABET = [
  { letter:'A', desc:'Punho fechado, polegar ao lado do indicador (não por cima)' },
  { letter:'B', desc:'4 dedos estendidos e juntos para cima, polegar dobrado para dentro' },
  { letter:'C', desc:'Mão curvada em forma de C, todos os dedos semi-dobrados' },
  { letter:'D', desc:'Indicador levantado em arco, polegar toca na ponta do médio' },
  { letter:'E', desc:'Dedos dobrados em garra, polegar toca no PIP do indicador' },
  { letter:'F', desc:'Polegar + indicador fazem círculo (OK), outros 3 estendidos' },
  { letter:'G', desc:'Indicador e polegar apontam horizontalmente para o lado' },
  { letter:'H', desc:'Indicador + médio estendidos e apontados horizontalmente' },
  { letter:'I', desc:'Só o mindinho estendido, polegar dobrado' },
  { letter:'J', desc:'Mindinho estendido + polegar para fora' },
  { letter:'K', desc:'Indicador para cima, médio para o lado, polegar no meio' },
  { letter:'L', desc:'Polegar horizontal + indicador para cima — forma de L' },
  { letter:'M', desc:'Indicador, médio e anelar dobrados sobre o polegar' },
  { letter:'N', desc:'Indicador e médio dobrados sobre o polegar' },
  { letter:'O', desc:'Todos os dedos curvados a tocar no polegar — forma de O' },
  { letter:'P', desc:'Indicador aponta para baixo, polegar para fora, mão inclinada' },
  { letter:'Q', desc:'Indicador e polegar apontam para baixo juntos' },
  { letter:'R', desc:'Indicador e médio cruzados e estendidos para cima' },
  { letter:'S', desc:'Punho fechado, polegar por cima dos dedos' },
  { letter:'T', desc:'Punho fechado com polegar espetado entre indicador e médio' },
  { letter:'U', desc:'Indicador + médio juntos e estendidos para cima' },
  { letter:'V', desc:'Indicador + médio estendidos em V aberto' },
  { letter:'W', desc:'Indicador, médio e anelar estendidos e separados (W)' },
  { letter:'X', desc:'Indicador dobrado em gancho, outros fechados' },
  { letter:'Y', desc:'Polegar + mindinho estendidos, outros fechados (Y)' },
  { letter:'Z', desc:'Indicador estendido — desenha um Z no ar' },
];

// ─── SVGs baseados na imagem oficial APS ─────────────────────────────────────
function HandSVG({ letter, highlight }) {
  const sk = '#f0c090';   // pele
  const sd = '#d4956a';   // sombra
  const ac = highlight ? '#ff6b00' : '#ffaa00'; // cor de destaque
  const wh = '#fff';

  const shapes = {

    // A — punho, polegar ao lado
    A: <g>
      <rect x="22" y="32" width="36" height="34" rx="8" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[26,34,42,50].map((x,i)=><rect key={i} x={x} y={24-i} width="8" height={14+i} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="17" cy="44" rx="5" ry="8" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(10 17 44)"/>
    </g>,

    // B — 4 dedos juntos para cima, polegar dobrado
    B: <g>
      <rect x="22" y="46" width="38" height="26" rx="8" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[24,32,40,48].map((x,i)=><rect key={i} x={x} y={10} width="8" height={36+i} rx="4" fill={ac} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="19" cy="52" rx="5" ry="9" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // C — mão em C
    C: <g>
      <path d="M62 20 Q28 10 18 40 Q12 58 28 70 Q44 78 62 70"
        fill="none" stroke={ac} strokeWidth="13" strokeLinecap="round"/>
      <path d="M62 20 Q28 10 18 40 Q12 58 28 70 Q44 78 62 70"
        fill="none" stroke={sk} strokeWidth="8" strokeLinecap="round"/>
    </g>,

    // D — indicador curvado para cima, polegar toca no médio
    D: <g>
      <ellipse cx="40" cy="54" rx="20" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <path d="M30 50 Q28 28 36 18 Q44 10 46 26 Q48 40 36 46" fill={ac} stroke={sd} strokeWidth="1"/>
      {[41,50,57].map((x,i)=><rect key={i} x={x} y={36+i*2} width="7" height={18-i*2} rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="22" cy="46" rx="5" ry="9" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(20 22 46)"/>
    </g>,

    // E — garra, polegar toca PIP
    E: <g>
      <ellipse cx="40" cy="54" rx="20" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[[26,30],[34,26],[43,28],[52,31]].map(([x,y],i)=>
        <path key={i} d={`M${x} ${y} Q${x-2} ${y+10} ${x+4} ${y+18}`}
          fill="none" stroke={ac} strokeWidth="7" strokeLinecap="round"/>
      )}
      <ellipse cx="20" cy="46" rx="5" ry="8" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(25 20 46)"/>
    </g>,

    // F — OK: polegar+indicador círculo, 3 estendidos
    F: <g>
      <ellipse cx="40" cy="55" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <circle cx="32" cy="38" r="8" fill="none" stroke={ac} strokeWidth="5"/>
      {[40,49,57].map((x,i)=><rect key={i} x={x} y={14+i*3} width="7" height={38-i*3} rx="3.5" fill={ac} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // G — indicador horizontal para o lado
    G: <g>
      <ellipse cx="42" cy="52" rx="18" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="16" y="36" width="32" height="8" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="10" y="42" width="14" height="7" rx="3.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-20 17 46)"/>
      {[42,51,58].map((x,i)=><rect key={i} x={x} y={36+i*2} width="7" height={14-i*2} rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // H — 2 dedos horizontais
    H: <g>
      <ellipse cx="42" cy="54" rx="18" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="14" y="30" width="34" height="8" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="14" y="40" width="34" height="8" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      {[46,54].map((x,i)=><rect key={i} x={x} y={36} width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="20" cy="50" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // I — só mindinho
    I: <g>
      <ellipse cx="40" cy="54" rx="20" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[24,33,42].map((x,i)=><rect key={i} x={x} y={38} width="8" height="16" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="52" y="18" width="7" height="34" rx="3.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <ellipse cx="20" cy="50" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // J — mindinho + polegar para fora
    J: <g>
      <ellipse cx="40" cy="54" rx="20" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[24,33,42].map((x,i)=><rect key={i} x={x} y={38} width="8" height="16" rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="52" y="18" width="7" height="34" rx="3.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <ellipse cx="16" cy="50" rx="5" ry="9" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-10 16 50)"/>
    </g>,

    // K — indicador cima, médio lado, polegar meio
    K: <g>
      <ellipse cx="40" cy="56" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="28" y="14" width="8" height="40" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="38" y="28" width="8" height="26" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(20 42 40)"/>
      {[49,56].map((x,i)=><rect key={i} x={x} y={38+i*2} width="7" height={18-i*2} rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="22" cy="42" rx="5" ry="9" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(15 22 42)"/>
    </g>,

    // L — L maiúsculo
    L: <g>
      <ellipse cx="42" cy="55" rx="17" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="34" y="12" width="8" height="42" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="14" y="48" width="26" height="8" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      {[43,51].map((x,i)=><rect key={i} x={x} y={36+i*3} width="7" height={20-i*3} rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // M — 3 dedos sobre polegar
    M: <g>
      <ellipse cx="40" cy="52" rx="20" ry="22" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[24,33,42].map((x,i)=><rect key={i} x={x} y={30+i} width="8" height="18" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>)}
      <rect x="52" y="36" width="7" height="14" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>
      <ellipse cx="32" cy="50" rx="12" ry="5" fill={sd} opacity="0.3"/>
      <ellipse cx="20" cy="44" rx="6" ry="9" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(30 20 44)"/>
    </g>,

    // N — 2 dedos sobre polegar
    N: <g>
      <ellipse cx="40" cy="52" rx="20" ry="22" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[26,35].map((x,i)=><rect key={i} x={x} y={30+i} width="8" height="18" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>)}
      {[44,52].map((x,i)=><rect key={i} x={x} y={36+i} width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="20" cy="44" rx="6" ry="9" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(30 20 44)"/>
    </g>,

    // O — círculo com todos os dedos
    O: <g>
      <ellipse cx="40" cy="52" rx="19" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <ellipse cx="38" cy="34" rx="12" ry="14" fill="none" stroke={ac} strokeWidth="9"/>
      <ellipse cx="38" cy="34" rx="12" ry="14" fill="none" stroke={sk} strokeWidth="5"/>
    </g>,

    // P — indicador para baixo, polegar para fora
    P: <g>
      <ellipse cx="40" cy="44" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="32" y="44" width="8" height="28" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      <ellipse cx="20" cy="46" rx="5" ry="9" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-10 20 46)"/>
      {[42,50].map((x,i)=><rect key={i} x={x} y={36} width="7" height="16" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // Q — indicador e polegar para baixo
    Q: <g>
      <ellipse cx="40" cy="42" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="33" y="42" width="8" height="26" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      <ellipse cx="24" cy="52" rx="5" ry="12" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(10 24 52)"/>
      {[43,51].map((x,i)=><rect key={i} x={x} y={36} width="7" height="14" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // R — dedos cruzados
    R: <g>
      <ellipse cx="40" cy="56" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="30" y="14" width="8" height="40" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(6 34 40)"/>
      <rect x="38" y="14" width="8" height="40" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-6 42 40)"/>
      {[50,57].map((x,i)=><rect key={i} x={x} y={38+i*2} width="7" height="18" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="20" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // S — punho, polegar por cima
    S: <g>
      <rect x="22" y="34" width="36" height="34" rx="8" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[26,34,42,50].map((x,i)=><rect key={i} x={x} y={26-i} width="8" height={12+i} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <rect x="22" y="30" width="24" height="8" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
    </g>,

    // T — polegar entre indicador e médio
    T: <g>
      <rect x="22" y="34" width="36" height="34" rx="8" fill={sk} stroke={sd} strokeWidth="1.2"/>
      {[26,34,42,50].map((x,i)=><rect key={i} x={x} y={26-i} width="8" height={12+i} rx="4" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="34" cy="32" rx="5" ry="7" fill={ac} stroke={sd} strokeWidth="1"/>
    </g>,

    // U — 2 dedos juntos para cima
    U: <g>
      <ellipse cx="40" cy="56" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="28" y="14" width="8" height="40" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="37" y="14" width="8" height="40" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      {[47,54].map((x,i)=><rect key={i} x={x} y={38+i*2} width="7" height="18" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="20" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // V — V aberto
    V: <g>
      <ellipse cx="40" cy="56" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="24" y="14" width="8" height="40" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-8 28 50)"/>
      <rect x="42" y="14" width="8" height="40" rx="4" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(8 46 50)"/>
      {[51,58].map((x,i)=><rect key={i} x={x} y={38+i*2} width="7" height="18" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // W — 3 dedos espalhados
    W: <g>
      <ellipse cx="40" cy="57" rx="20" ry="17" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="22" y="14" width="7" height="42" rx="3.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-6 26 48)"/>
      <rect x="33" y="12" width="8" height="44" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      <rect x="44" y="14" width="7" height="42" rx="3.5" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(6 48 48)"/>
      <rect x="54" y="30" width="7" height="24" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>
      <ellipse cx="16" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // X — gancho
    X: <g>
      <ellipse cx="40" cy="54" rx="20" ry="20" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <path d="M34 36 Q30 24 36 18 Q44 14 44 26 Q44 38 34 38" fill={ac} stroke={sd} strokeWidth="1"/>
      {[42,50,57].map((x,i)=><rect key={i} x={x} y={36+i*2} width="7" height="18" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="20" cy="50" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
    </g>,

    // Y — polegar + mindinho
    Y: <g>
      <ellipse cx="40" cy="54" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="54" y="18" width="7" height="34" rx="3.5" fill={ac} stroke={sd} strokeWidth="1"/>
      <ellipse cx="16" cy="48" rx="5" ry="12" fill={ac} stroke={sd} strokeWidth="1" transform="rotate(-15 16 48)"/>
      {[30,38,46].map((x,i)=><rect key={i} x={x} y={38} width="7" height="14" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
    </g>,

    // Z — indicador estendido (desenha Z)
    Z: <g>
      <ellipse cx="40" cy="56" rx="18" ry="18" fill={sk} stroke={sd} strokeWidth="1.2"/>
      <rect x="30" y="14" width="8" height="40" rx="4" fill={ac} stroke={sd} strokeWidth="1"/>
      {[40,49,56].map((x,i)=><rect key={i} x={x} y={38+i*2} width="7" height="18" rx="3.5" fill={sk} stroke={sd} strokeWidth="1"/>)}
      <ellipse cx="18" cy="52" rx="5" ry="8" fill={sk} stroke={sd} strokeWidth="1"/>
      {/* Z tracejado */}
      <path d="M48 18 L60 18 L48 30 L60 30" fill="none" stroke={wh} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
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
