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

// ─── SVGs estilo "line art" (contorno), sem preenchimento colorido ──────────
// Réplica do estilo da imagem oficial APS: mãos brancas com contorno preto,
// e a parte relevante do gesto destacada a laranja.
function HandSVG({ letter, highlight }) {
  const ac = highlight ? '#ff6b00' : '#ffaa00'; // cor de destaque (parte chave do gesto)

  const sk = '#ffffff';     // preenchimento da mão (branco)
  const ak = ac;            // preenchimento de destaque
  const sd = '#1a1a1a';     // contorno (preto)
  const crease = '#888888'; // linha de articulação (cinza)

  // Dedo: forma cónica vertical com vinco a 38% da altura, ponta arredondada
  // x = posição esquerda, y = topo da ponta, len = comprimento total, w = largura na base
  const Finger = ({ x, y, len, w = 13, fill = sk, rotate = 0, cx, cy }) => {
    const tipW = w * 0.78;

    const path = `M${x} ${y + (w-tipW)/2}
      Q${x} ${y - tipW*0.55} ${x + tipW/2} ${y - tipW*0.6}
      Q${x + tipW} ${y - tipW*0.55} ${x + tipW} ${y + (w-tipW)/2}
      L${x + w} ${y + len}
      Q${x + w} ${y + len + 6} ${x + w - 6} ${y + len + 6}
      L${x + 6} ${y + len + 6}
      Q${x} ${y + len + 6} ${x} ${y + len}
      Z`;
    const transform = rotate ? `rotate(${rotate} ${cx ?? x + w/2} ${cy ?? y + len/2})` : undefined;
    const creaseY1 = y + len * 0.40;
    const creaseY2 = y + len * 0.68;
    return (
      <g transform={transform}>
        <path d={path} fill={fill} stroke={sd} strokeWidth="1.8"/>
        <line x1={x+2} y1={creaseY1} x2={x+w-2} y2={creaseY1} stroke={crease} strokeWidth="1.6" opacity="0.55"/>
        <line x1={x+2} y1={creaseY2} x2={x+w-2} y2={creaseY2} stroke={crease} strokeWidth="1.6" opacity="0.4"/>
      </g>
    );
  };

  // Polegar: forma mais curta e larga, com rotação livre
  const Thumb = ({ x, y, len = 30, w = 14, rotate = 0, cx, cy, fill = sk }) => {
    const tipW = w * 0.8;
    const path = `M${x} ${y + (w-tipW)/2}
      Q${x} ${y - tipW*0.55} ${x + tipW/2} ${y - tipW*0.6}
      Q${x + tipW} ${y - tipW*0.55} ${x + tipW} ${y + (w-tipW)/2}
      L${x + w} ${y + len}
      Q${x + w} ${y + len + 7} ${x + w - 7} ${y + len + 7}
      L${x + 7} ${y + len + 7}
      Q${x} ${y + len + 7} ${x} ${y + len}
      Z`;
    return (
      <g transform={`rotate(${rotate} ${cx ?? x + w/2} ${cy ?? y + len/2})`}>
        <path d={path} fill={fill} stroke={sd} strokeWidth="1.8"/>
        <line x1={x+2} y1={y+len*0.45} x2={x+w-2} y2={y+len*0.45} stroke={crease} strokeWidth="1.6" opacity="0.5"/>
      </g>
    );
  };

  // Palma: forma trapezoidal arredondada
  const Palm = ({ x = 14, y = 40, w = 52, h = 36 }) => (
    <path
      d={`M${x} ${y+h*0.15}
          Q${x} ${y} ${x+8} ${y}
          L${x+w-8} ${y}
          Q${x+w} ${y} ${x+w} ${y+h*0.15}
          L${x+w} ${y+h-10}
          Q${x+w} ${y+h} ${x+w-10} ${y+h}
          L${x+10} ${y+h}
          Q${x} ${y+h} ${x} ${y+h-10}
          Z`}
      fill={sk} stroke={sd} strokeWidth="1.8"
    />
  );

  // Punho fechado (todos os dedos curvados sobre a palma) — base reutilizável
  const ClosedFist = ({ thumbSide = 'left' }) => (
    <g>
      <Palm x={16} y={36} w={50} h={36}/>
      {[24,34,44,54].map((x,i)=>(
        <path key={i} d={`M${x} 38 Q${x+6} 22 ${x+13} 26 Q${x+15} 34 ${x+10} 40 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      {thumbSide === 'left'
        ? <Thumb x={8} y={48} len={26} w={13} rotate={-25} fill={sk}/>
        : <Thumb x={58} y={48} len={26} w={13} rotate={25} fill={sk}/>}
    </g>
  );

  const shapes = {

    // A — punho fechado, polegar ao lado do indicador
    A: <g>
      <ClosedFist thumbSide="left"/>
    </g>,

    // B — punho fechado, polegar para cima (joinha)
    B: <g>
      <Palm x={18} y={42} w={48} h={32}/>
      {[26,36,46,55].map((x,i)=>(
        <path key={i} d={`M${x} 44 Q${x+6} 30 ${x+12} 33 Q${x+14} 40 ${x+9} 46 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={10} y={10} len={32} w={14} rotate={0} fill={ak}/>
    </g>,

    // C — mão curva em forma de C, vista de perfil
    C: <g>
      <path d="M64 18 Q34 8 18 28 Q6 44 16 60 Q28 74 56 70"
        fill="none" stroke={sd} strokeWidth="17" strokeLinecap="round"/>
      <path d="M64 18 Q34 8 18 28 Q6 44 16 60 Q28 74 56 70"
        fill="none" stroke={sk} strokeWidth="13" strokeLinecap="round"/>
      <path d="M64 18 Q34 8 18 28 Q6 44 16 60 Q28 74 56 70"
        fill="none" stroke={ak} strokeWidth="2" strokeDasharray="4 4" opacity="0.6"/>
    </g>,

    // D — mão vista de cima/baixo, dedos juntos a apontar para baixo-esquerda
    D: <g>
      <ellipse cx="46" cy="22" rx="24" ry="13" fill={sk} stroke={sd} strokeWidth="1.8"/>
      <Finger x={14} y={28} len={36} w={11} fill={sk} rotate={-8}/>
      <Finger x={26} y={26} len={42} w={12} fill={sk} rotate={-4}/>
      <Finger x={39} y={25} len={45} w={12} fill={ak} rotate={0}/>
      <Finger x={52} y={26} len={42} w={12} fill={sk} rotate={4}/>
      <Finger x={64} y={28} len={36} w={11} fill={sk} rotate={8}/>
      <path d="M14 66 Q10 70 16 74" fill="none" stroke={sd} strokeWidth="2" opacity="0.5"/>
    </g>,

    // E — dedos juntos verticais ligeiramente curvados, polegar dobrado por baixo
    E: <g>
      <Palm x={16} y={48} w={50} h={28}/>
      <Finger x={20} y={16} len={34} w={11} fill={sk} rotate={2}/>
      <Finger x={32} y={12} len={38} w={12} fill={sk} rotate={0}/>
      <Finger x={45} y={12} len={38} w={12} fill={ak} rotate={0}/>
      <Finger x={58} y={16} len={34} w={11} fill={sk} rotate={-2}/>
      <ellipse cx="36" cy="70" rx="18" ry="8" fill={sk} stroke={sd} strokeWidth="1.8"/>
    </g>,

    // F — polegar+indicador em círculo (OK), 3 dedos estendidos
    F: <g>
      <Palm x={18} y={46} w={48} h={30}/>
      <Finger x={44} y={10} len={38} w={11} fill={sk} rotate={2}/>
      <Finger x={56} y={12} len={36} w={11} fill={sk} rotate={6}/>
      <Finger x={67} y={18} len={32} w={10} fill={sk} rotate={12}/>
      <circle cx="30" cy="34" r="13" fill="none" stroke={ak} strokeWidth="8"/>
      <circle cx="30" cy="34" r="13" fill="none" stroke={sd} strokeWidth="1.8"/>
    </g>,

    // G — punho fechado, visto de frente
    G: <g>
      <ClosedFist thumbSide="left"/>
    </g>,

    // H — punho fechado com indicador curvado/dobrado para a frente (gancho)
    H: <g>
      <Palm x={18} y={40} w={48} h={32}/>
      <path d="M28 42 Q14 28 24 14 Q38 4 38 20 Q38 36 24 42 Z"
        fill={ak} stroke={sd} strokeWidth="1.8"/>
      <path d="M40 42 Q34 28 42 20 Q50 14 48 28 Q46 38 38 42 Z"
        fill={sk} stroke={sd} strokeWidth="1.6"/>
      {[50,60].map((x,i)=>(
        <path key={i} d={`M${x} 42 Q${x+5} 30 ${x+11} 33 Q${x+13} 40 ${x+9} 44 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={8} y={48} len={24} w={12} rotate={-20} fill={sk}/>
    </g>,

    // I — punho fechado, indicador estendido para cima
    I: <g>
      <Palm x={18} y={44} w={48} h={30}/>
      <Finger x={32} y={8} len={42} w={13} fill={ak} rotate={0}/>
      {[46,56].map((x,i)=>(
        <path key={i} d={`M${x} 46 Q${x+5} 32 ${x+11} 35 Q${x+13} 42 ${x+9} 48 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={10} y={50} len={22} w={12} rotate={-22} fill={sk}/>
    </g>,

    // J — mão vertical, dedos juntos espalmados (canto da mão)
    J: <g>
      <ellipse cx="22" cy="50" rx="12" ry="18" fill={sk} stroke={sd} strokeWidth="1.8"/>
      <Finger x={22} y={8} len={58} w={11} fill={sk} rotate={0}/>
      <Finger x={34} y={6} len={60} w={11} fill={ak} rotate={0}/>
      <Finger x={46} y={8} len={58} w={11} fill={sk} rotate={0}/>
      <Finger x={58} y={12} len={54} w={10} fill={sk} rotate={0}/>
      {[34,46,58].map((x,i)=><line key={i} x1={x} y1="14" x2={x} y2="68" stroke={sd} strokeWidth="0.8" opacity="0.35"/>)}
    </g>,

    // K — indicador a apontar na diagonal para cima, vinco de movimento
    K: <g>
      <Palm x={16} y={48} w={48} h={30}/>
      <Finger x={30} y={6} len={48} w={13} fill={ak} rotate={22} cx={36} cy={30}/>
      {[48,58].map((x,i)=>(
        <path key={i} d={`M${x} 50 Q${x+5} 36 ${x+11} 39 Q${x+13} 46 ${x+9} 52 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={8} y={54} len={22} w={12} rotate={-15} fill={sk}/>
      <path d="M58 14 Q66 12 68 20" fill="none" stroke={ak} strokeWidth="2.5" strokeDasharray="2 4" strokeLinecap="round" opacity="0.8"/>
      <path d="M62 24 Q70 22 72 30" fill="none" stroke={ak} strokeWidth="2.5" strokeDasharray="2 4" strokeLinecap="round" opacity="0.55"/>
    </g>,

    // L — indicador dobrado em gancho para baixo, restantes fechados
    L: <g>
      <Palm x={18} y={46} w={48} h={30}/>
      <path d="M40 48 Q24 38 28 20 Q34 4 46 12 Q54 20 48 34 Q44 44 36 48 Z"
        fill={ak} stroke={sd} strokeWidth="1.8"/>
      {[50,60].map((x,i)=>(
        <path key={i} d={`M${x} 48 Q${x+5} 35 ${x+11} 38 Q${x+13} 45 ${x+9} 50 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={10} y={52} len={22} w={12} rotate={-18} fill={sk}/>
    </g>,

    // M — mão aberta, dedos relaxados/curvados a apontar para baixo
    M: <g>
      <ellipse cx="42" cy="26" rx="26" ry="15" fill={sk} stroke={sd} strokeWidth="1.8"/>
      {[14,27,41,55,67].map((x,i)=>{
        const acc = i===2;
        return (
          <path key={i} d={`M${x} 30 Q${x+5} 50 ${x-2} 70 Q${x-6} 78 ${x-12} 76`}
            fill="none" stroke={acc?ak:sk} strokeWidth="10" strokeLinecap="round"/>
        );
      })}
    </g>,

    // N — mão com dedos curvados, indicador mais dobrado que M
    N: <g>
      <ellipse cx="42" cy="28" rx="25" ry="14" fill={sk} stroke={sd} strokeWidth="1.8"/>
      {[16,29,43,57].map((x,i)=>{
        const acc = i===0;
        const end = acc ? 58 : 72;
        return (
          <path key={i} d={`M${x} 32 Q${x+6} ${end-12} ${x-2} ${end} Q${x-6} ${end+6} ${x-11} ${end+3}`}
            fill="none" stroke={acc?ak:sk} strokeWidth="10" strokeLinecap="round"/>
        );
      })}
      <ellipse cx="22" cy="58" rx="9" ry="12" fill={sk} stroke={sd} strokeWidth="1.6"/>
    </g>,

    // O — polegar e indicador formam um círculo, restantes dedos curvados visíveis
    O: <g>
      <Palm x={18} y={48} w={48} h={28}/>
      {[28,38,48].map((x,i)=>(
        <path key={i} d={`M${x} 50 Q${x+3} 34 ${x+11} 32`}
          fill="none" stroke={sk} strokeWidth="11" strokeLinecap="round"/>
      ))}
      <circle cx="36" cy="28" r="11" fill="none" stroke={ak} strokeWidth="7"/>
      <circle cx="36" cy="28" r="11" fill="none" stroke={sd} strokeWidth="1.8"/>
    </g>,

    // P — mão achatada/aberta, dedos juntos apontando para o lado
    P: <g>
      <ellipse cx="24" cy="48" rx="16" ry="14" fill={sk} stroke={sd} strokeWidth="1.8"/>
      <Finger x={32} y={42} len={40} w={11} fill={sk} rotate={90} cx={32} cy={48}/>
      <Finger x={32} y={42} len={44} w={12} fill={ak} rotate={90} cx={32} cy={62}/>
      <Finger x={32} y={42} len={40} w={11} fill={sk} rotate={90} cx={32} cy={76}/>
      <Finger x={32} y={42} len={36} w={10} fill={sk} rotate={90} cx={32} cy={90}/>
    </g>,

    // Q — dedos curvados/dobrados para baixo, com vincos de movimento
    Q: <g>
      <ellipse cx="40" cy="24" rx="24" ry="14" fill={sk} stroke={sd} strokeWidth="1.8"/>
      {[16,28,41,54].map((x,i)=>{
        const acc = i===1;
        return (
          <path key={i} d={`M${x} 28 Q${x+4} 46 ${x-1} 62`}
            fill="none" stroke={acc?ak:sk} strokeWidth="10" strokeLinecap="round"/>
        );
      })}
      <ellipse cx="62" cy="34" rx="10" ry="13" fill={sk} stroke={sd} strokeWidth="1.6"/>
      <path d="M14 50 Q8 56 12 64" fill="none" stroke={ak} strokeWidth="2.5" strokeDasharray="2 4" strokeLinecap="round" opacity="0.6"/>
    </g>,

    // R — punho fechado com indicador estendido para o lado
    R: <g>
      <Palm x={20} y={48} w={46} h={28}/>
      <Finger x={4} y={38} len={42} w={12} fill={ak} rotate={-90} cx={25} cy={59}/>
      {[48,58].map((x,i)=>(
        <path key={i} d={`M${x} 50 Q${x+5} 36 ${x+11} 39 Q${x+13} 46 ${x+9} 52 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={56} y={62} len={20} w={11} rotate={45} fill={sk}/>
    </g>,

    // S — punho fechado simples
    S: <g>
      <ClosedFist thumbSide="left"/>
    </g>,

    // T — punho fechado com indicador a apontar na diagonal para baixo/frente
    T: <g>
      <Palm x={18} y={36} w={48} h={28}/>
      <Finger x={2} y={36} len={40} w={11} fill={ak} rotate={-65} cx={22} cy={56}/>
      {[44,53].map((x,i)=>(
        <path key={i} d={`M${x} 38 Q${x+5} 25 ${x+11} 28 Q${x+13} 35 ${x+9} 41 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={56} y={50} len={20} w={11} rotate={55} fill={sk}/>
    </g>,

    // U — indicador + médio juntos, a apontar para o lado/frente
    U: <g>
      <ellipse cx="60" cy="50" rx="16" ry="16" fill={sk} stroke={sd} strokeWidth="1.8"/>
      <Finger x={2} y={32} len={50} w={12} fill={ak} rotate={-90} cx={27} cy={57}/>
      <Finger x={2} y={45} len={50} w={12} fill={sk} rotate={-90} cx={27} cy={70}/>
    </g>,

    // V — indicador e médio em V, virados para cima
    V: <g>
      <Palm x={18} y={50} w={46} h={26}/>
      <Finger x={22} y={10} len={46} w={12} fill={ak} rotate={-10} cx={28} cy={56}/>
      <Finger x={42} y={10} len={46} w={12} fill={sk} rotate={10} cx={48} cy={56}/>
      {[58,67].map((x,i)=>(
        <path key={i} d={`M${x} 52 Q${x+5} 40 ${x+10} 43 Q${x+12} 50 ${x+8} 55 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <ellipse cx="20" cy="56" rx="8" ry="11" fill={sk} stroke={sd} strokeWidth="1.6"/>
    </g>,

    // W — 3 dedos espalhados para cima, com vincos de movimento
    W: <g>
      <Palm x={14} y={52} w={52} h={24}/>
      <Finger x={16} y={12} len={44} w={11} fill={ak} rotate={-12} cx={22} cy={56}/>
      <Finger x={32} y={8} len={48} w={12} fill={sk} rotate={0} cx={38} cy={56}/>
      <Finger x={48} y={12} len={44} w={11} fill={ak} rotate={12} cx={54} cy={56}/>
      <path d={`M64 56 Q70 50 68 60 Q66 70 60 70 Z`} fill={sk} stroke={sd} strokeWidth="1.6"/>
      <ellipse cx="14" cy="58" rx="8" ry="11" fill={sk} stroke={sd} strokeWidth="1.6"/>
      <path d="M14 4 Q22 -2 28 4" fill="none" stroke={ak} strokeWidth="2" strokeDasharray="2 3" opacity="0.6"/>
      <path d="M32 0 Q40 -6 46 0" fill="none" stroke={ak} strokeWidth="2" strokeDasharray="2 3" opacity="0.6"/>
      <path d="M50 4 Q58 -2 64 4" fill="none" stroke={ak} strokeWidth="2" strokeDasharray="2 3" opacity="0.6"/>
    </g>,

    // X — punho fechado com indicador na diagonal acentuada para cima/lado
    X: <g>
      <Palm x={16} y={48} w={48} h={30}/>
      <Finger x={24} y={4} len={48} w={13} fill={ak} rotate={40} cx={30} cy={28}/>
      {[48,58].map((x,i)=>(
        <path key={i} d={`M${x} 50 Q${x+5} 36 ${x+11} 39 Q${x+13} 46 ${x+9} 52 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={8} y={54} len={22} w={12} rotate={-15} fill={sk}/>
    </g>,

    // Y — polegar + mindinho estendidos (shaka), virado para baixo
    Y: <g>
      <Palm x={20} y={36} w={42} h={26}/>
      {[28,38,48].map((x,i)=>(
        <path key={i} d={`M${x} 40 Q${x+5} 28 ${x+11} 31 Q${x+13} 38 ${x+9} 44 Z`}
          fill={sk} stroke={sd} strokeWidth="1.6"/>
      ))}
      <Thumb x={56} y={36} len={32} w={13} rotate={35} fill={ak}/>
      <Thumb x={6} y={36} len={32} w={13} rotate={-35} fill={ak}/>
    </g>,

    // Z — punho fechado de lado, com a letra "Z" desenhada na palma
    Z: <g>
      <ClosedFist thumbSide="right"/>
      <path d="M28 44 L52 44 L28 64 L52 64" fill="none" stroke={ak} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </g>,
  };

  const fallback = (
    <g>
      <ellipse cx="40" cy="50" rx="20" ry="24" fill={sk} stroke={sd} strokeWidth="1.5"/>
      <text x="40" y="56" textAnchor="middle" fontSize="22" fontWeight="bold" fill={ac} fontFamily="monospace">{letter}</text>
    </g>
  );

  return (
    <svg width="80" height="80" viewBox="-5 -8 90 96"
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
