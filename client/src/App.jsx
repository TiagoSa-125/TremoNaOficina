import React, { useState, useEffect, useCallback, useRef } from 'react';
import Camera, { LGP_ALPHABET, LetterPhoto } from './components/Camera';
import TrainingMode from './components/TrainingMode';
import { useGame } from './hooks/useGame';

// ─────────────────────────────────────────────
//  ECRÃ DE MENU INICIAL
// ─────────────────────────────────────────────
function MenuScreen({ onPlay, onTrain }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={m.screen}>
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes scanline {
          0%   { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .btn-treino { transition: all 0.18s ease; }
        .btn-treino:hover {
          background: rgba(255,170,0,0.12) !important;
          border-color: #ffaa00 !important;
          color: #ffcc55 !important;
          transform: scale(1.04);
          box-shadow: 0 0 18px rgba(255,170,0,0.35);
        }
      `}</style>

      <div style={m.scanline} />
      <div style={m.grid} />

      <div style={m.content}>
        <div style={m.handIcon}>🤟</div>

        <div style={m.titleBlock}>
          <h1 style={m.title}>TREMU</h1>
          <p style={m.subtitle}>NA OFICINA</p>
          <div style={m.titleLine} />
        </div>

        <p style={m.desc}>
          Adivinha palavras de <strong style={{ color: '#ff6b00' }}>4 letras</strong><br />
          usando <strong style={{ color: '#ffaa00' }}>Linguagem Gestual Portuguesa</strong>
        </p>

        <button
          style={{ ...m.playBtn, ...(hovered ? m.playBtnHover : {}) }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onPlay}
        >
          <span style={m.playBtnText}>▶ JOGAR</span>
        </button>

        {/* ══════════════════════════════════════════════════════════════
            BOTÃO MODO DE TREINO — ATIVO
            → Para ESCONDER: envolve o botão abaixo com  {/*  e  *\/}
            → Para MOSTRAR: remove esses comentários
        ══════════════════════════════════════════════════════════════ */}
        {/* <button className="btn-treino" style={m.trainBtn} onClick={onTrain}>
          🎓 Modo de Treino (gestos)
        </button>*\}

        <div style={m.legend}>
          <div style={m.legendRow}>
            <span style={{ ...m.legendDot, background: '#39ff14' }} />
            <span>Letra certa na posição certa</span>
          </div>
          <div style={m.legendRow}>
            <span style={{ ...m.legendDot, background: '#ffd700' }} />
            <span>Letra existe noutras posição</span>
          </div>
          <div style={m.legendRow}>
            <span style={{ ...m.legendDot, background: '#3a3a5c' }} />
            <span>Letra não existe na palavra</span>
          </div>
        </div>

        <p style={m.footer}>6 tentativas • Alfabeto Manual LGP</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ECRÃ DE JOGO
// ─────────────────────────────────────────────
function GameScreen({ onBack }) {
  const {
    guesses, currentGuess, gameStatus,
    addLetter, deleteLetter, submitGuess, resetGame,
    wordLength, targetWord,
  } = useGame();

  const [slotFeedback, setSlotFeedback]         = useState([null, null, null, null]);
  const [showFeedback, setShowFeedback]         = useState(false);
  const [confirmedLetters, setConfirmedLetters] = useState([null, null, null, null]);
  const [toast, setToast]                       = useState('');

  // Painel do alfabeto LGP (antes vivia dentro da Camera, agora fica aqui)
  const [showAlphabet, setShowAlphabet]   = useState(false);
  const [selectedLetter, setSelectedLetter] = useState('A');

  const confirmedRef = useRef([null, null, null, null]);

  const showToast = useCallback((msg, dur = 2200) => {
    setToast(msg);
    setTimeout(() => setToast(''), dur);
  }, []);

  useEffect(() => {
    if (guesses.length === 0) return;
    const last = guesses[guesses.length - 1];

    setSlotFeedback(last.evaluation.map(e => e));
    setShowFeedback(true);

    const next = [...confirmedRef.current];
    last.word.split('').forEach((letter, i) => {
      if (last.evaluation[i] === 'correct') next[i] = letter;
    });

    confirmedRef.current = next;
    setConfirmedLetters(next);

    const t = setTimeout(() => {
      setShowFeedback(false);
      setSlotFeedback([null, null, null, null]);
    }, 1200);

    return () => clearTimeout(t);
  }, [guesses.length]);

  useEffect(() => {
    if (gameStatus === 'won') {
      const t = setTimeout(() => showToast('🏆 GANHASTE,PARABENS!'), 1200);
      return () => clearTimeout(t);
    }
    if (gameStatus === 'lost') {
      const t = setTimeout(() => showToast(`💀 Era: ${targetWord}`), 1200);
      return () => clearTimeout(t);
    }
  }, [gameStatus]);

  // BUG CORRIGIDO: se o painel do alfabeto estiver aberto e o jogo terminar
  // (ganhou/perdeu), o botão que o fecha desaparece com o resto dos controlos
  // de jogo — o que deixava o histórico escondido para sempre, sem maneira de
  // o voltar a mostrar. Por isso fechamos o painel automaticamente aqui.
  useEffect(() => {
    if (gameStatus !== 'playing') setShowAlphabet(false);
  }, [gameStatus]);

  const slotsToFill = [0,1,2,3].filter(i => !confirmedRef.current[i]).length;

  const displayLetters = (() => {
    const result = [];
    let cgIndex = 0;
    for (let i = 0; i < 4; i++) {
      if (confirmedRef.current[i]) result.push(confirmedRef.current[i]);
      else result.push(currentGuess[cgIndex++] || '');
    }
    return result;
  })();

  const fullGuess = displayLetters.join('');

  const handleSubmit = useCallback(() => {
    if (currentGuess.length < slotsToFill) {
      showToast('Precisa de 4 letras!');
      return;
    }
    submitGuess(fullGuess);
  }, [currentGuess, slotsToFill, fullGuess]);

  const handleReset = useCallback(() => {
    confirmedRef.current = [null, null, null, null];
    setConfirmedLetters([null, null, null, null]);
    setSlotFeedback([null, null, null, null]);
    setShowFeedback(false);
    setShowAlphabet(false); // BUG CORRIGIDO: o painel ficava aberto num novo jogo
    resetGame();
  }, [resetGame]);

  const slotColor = (i) => {
    if (showFeedback && slotFeedback[i]) {
      if (slotFeedback[i] === 'correct') return { bg:'#39ff14', border:'#39ff14', text:'#000', glow:'rgba(57,255,20,0.5)' };
      if (slotFeedback[i] === 'present') return { bg:'#ffd700', border:'#ffd700', text:'#000', glow:'rgba(255,215,0,0.5)' };
      if (slotFeedback[i] === 'absent') return { bg:'#ff2244', border:'#ff2244', text:'#fff', glow:'rgba(255,34,68,0.5)' };
    }

    if (confirmedLetters[i]) return { bg:'rgba(57,255,20,0.15)', border:'#39ff14', text:'#39ff14', glow:'rgba(57,255,20,0.2)' };
    if (displayLetters[i]) return { bg:'rgba(255,107,0,0.1)', border:'#ff6b00', text:'#ff6b00', glow:'rgba(255,107,0,0.2)' };

    return { bg:'transparent', border:'#2a2a3e', text:'transparent', glow:'none' };
  };

  const attemptsLeft = 6 - guesses.length;

  // Dados do painel do alfabeto (movidos para fora da Camera)
  const selectedAlphabetData = LGP_ALPHABET.find(l => l.letter === selectedLetter) || LGP_ALPHABET[0];

  return (
    <div style={g.screen}>
      <style>{`
        .slot-animate { animation: feedbackPulse 0.4s ease forwards; }

        /* BUG CORRIGIDO: estas duas animações eram usadas mas nunca tinham
           sido definidas, por isso o "pulse" das letras certas e o slide do
           toast nunca se viam. */
        @keyframes feedbackPulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }

        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes chipPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,107,0,.5); }
          50%     { box-shadow: 0 0 0 5px rgba(255,107,0,0); }
        }
        .alphabet-chip:hover {
          border-color: #ff6b00 !important;
          transform: scale(1.06);
        }

        /* ── Hover dos botões ── */
        .btn-voltar { transition: all 0.18s ease; }
        .btn-voltar:hover {
          border-color: #ff6b00 !important;
          color: #ff6b00 !important;
          background: rgba(255,107,0,0.08) !important;
        }

        .btn-apagar:hover {
          border-color: #ff2244 !important;
          background: rgba(255,34,68,0.2) !important;
          transform: scale(1.04);
        }

        .btn-confirmar:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(255,107,0,0.65);
        }
        .btn-confirmar:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn-alfabeto { transition: all 0.18s ease; }
        .btn-alfabeto:hover { transform: scale(1.03); }
        .btn-alfabeto:not(.active):hover {
          border-color: #ff6b00 !important;
          color: #ff6b00 !important;
          background: rgba(255,107,0,0.1) !important;
        }
        .btn-alfabeto.active:hover {
          box-shadow: 0 0 26px rgba(255,107,0,0.6);
          filter: brightness(1.08);
        }

        .btn-novo-jogo { transition: all 0.18s ease; }
        .btn-novo-jogo:hover {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(255,107,0,0.65);
        }

        /* ── Em mobile a câmara e a coluna direita empilham-se, e a câmara
           saía do ecrã quando fazias scroll para ver o abecedário. Aqui ela
           fica "colada" no topo enquanto fazes scroll pelo resto. ── */
        @media (max-width: 820px) {
          .camera-col {
            position: sticky;
            top: 0;
            z-index: 40;
            background: #0a0a0f;
            padding: 8px 0 12px;
            box-shadow: 0 10px 18px rgba(0,0,0,0.45);
          }
        }
      `}</style>

      {toast && <div style={g.toast}>{toast}</div>}

      <div style={g.header}>
        <button className="btn-voltar" style={g.voltarBtn} onClick={onBack}>← VOLTAR</button>

        <div style={g.titleBlock}>
          <span style={g.title}>TREMU</span>
          <span style={g.titleSub}>NA OFICINA</span>
        </div>

        <div style={g.attempts}>
          <span style={g.attemptsNum}>{attemptsLeft}</span>
          <span style={g.attemptsLabel}>tentativas</span>
        </div>
      </div>

      <div style={g.body}>
        <div className="camera-col" style={g.leftCol}>
          <Camera
            onLetterDetected={(letter) => addLetter(letter, slotsToFill)}
            active={gameStatus === 'playing'}
            currentGuessLength={currentGuess.length}
            wordLength={slotsToFill}
          />
        </div>

        <div style={g.rightCol}>

          {/* HISTÓRICO (some quando o painel do alfabeto está aberto) */}
          {!showAlphabet && guesses.length > 0 && (
            <div style={g.history}>
              {guesses.map((guess, gi) => (
                <div key={gi} style={g.historyRow}>
                  {guess.word.split('').map((letter, li) => {
                    const c = guess.evaluation[li];
                    return (
                      <div key={li} style={{
                        ...g.historyCell,
                        background: c === 'correct' ? '#39ff14' : c === 'present' ? '#ffd700' : '#2a2a3e',
                        color: c === 'correct' ? '#000' : c === 'present' ? '#000' : '#666',
                        border: `1px solid ${c === 'correct' ? '#39ff14' : c === 'present' ? '#ffd700' : '#3a3a5c'}`
                      }}>
                        {letter}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* SLOT */}
          <div style={g.slotsRow}>
            {[0,1,2,3].map(i => {
              const col = slotColor(i);
              const letter = displayLetters[i];

              return (
                <div
                  key={i}
                  className={showFeedback && letter ? 'slot-animate' : ''}
                  style={{
                    ...g.slot,
                    background: col.bg,
                    border: `3px solid ${col.border}`,
                    color: col.text,
                    boxShadow: col.glow !== 'none' ? `0 0 20px ${col.glow}` : 'none',
                  }}
                >
                  {letter}
                </div>
              );
            })}
          </div>

          {/* BOTÕES */}
          {gameStatus === 'playing' && (
            <>
              <div style={g.actionRow}>
                <button className="btn-apagar" style={g.delBtn} onClick={deleteLetter}>
                  ⌫ APAGAR
                </button>

                <button
                  className="btn-confirmar"
                  style={g.enterBtn}
                  onClick={handleSubmit}
                  disabled={currentGuess.length < slotsToFill}
                >
                  CONFIRMAR ✓
                </button>
              </div>

              {/* BOTÃO ALFABETO — agora é o mesmo que estava na câmara,
                  só que fica aqui em baixo do Apagar/Confirmar */}
              <button
                className={`btn-alfabeto ${showAlphabet ? 'active' : ''}`}
                style={{ ...g.alphabetBtn, ...(showAlphabet ? g.alphabetBtnActive : {}) }}
                onClick={() => setShowAlphabet(v => !v)}
              >
                {showAlphabet ? '✕ FECHAR ALFABETO' : '🖐 ALFABETO LGP'}
              </button>

              {/* PAINEL DO ALFABETO — vindo da câmara, agora no fluxo normal
                  da página (por isso o histórico esconde-se para compensar) */}
              {showAlphabet && (
                <div style={g.alphabetPanel}>
                  <div style={g.alphabetHead}>
                    <span style={g.alphabetTitle}>Alfabeto Oficial LGP</span>
                  </div>

                  <div style={g.alphabetGrid}>
                    {LGP_ALPHABET.map(({ letter }) => {
                      const isSelected = selectedLetter === letter;
                      return (
                        <div
                          key={letter}
                          className="alphabet-chip"
                          onClick={() => setSelectedLetter(letter)}
                          style={{
                            ...g.alphabetChip,
                            background: isSelected ? 'rgba(255,170,0,.15)' : 'rgba(10,10,15,.85)',
                            border: `1px solid ${isSelected ? '#ffaa00' : 'rgba(42,42,62,.8)'}`,
                            color: isSelected ? '#ffaa00' : '#aaa',
                          }}
                        >
                          {letter}
                        </div>
                      );
                    })}
                  </div>

                  <div style={g.alphabetDetail} key={selectedAlphabetData.letter}>
                    <LetterPhoto
                      letter={selectedAlphabetData.letter}
                      size={88}
                    />
                    <div style={g.alphabetDetailText}>
                      <span style={g.alphabetDetailLetter}>{selectedAlphabetData.letter}</span>
                      <span style={g.alphabetDetailDesc}>{selectedAlphabetData.desc}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* GAME OVER */}
          {gameStatus !== 'playing' && (
            <div style={g.gameOverBlock}>
              <div style={g.gameOverBadge}>
                {gameStatus === 'won' ? '🏆 GANHASTE!' : `💀 Era: ${targetWord}`}
              </div>
              <button className="btn-novo-jogo" style={g.newGameBtn} onClick={handleReset}>
                ↺ NOVO JOGO
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('menu');
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {screen === 'menu'  && <MenuScreen   onPlay={() => setScreen('game')} onTrain={() => setScreen('train')} />}
      {screen === 'game'  && <GameScreen   onBack={() => setScreen('menu')} />}
      {screen === 'train' && <TrainingMode onBack={() => setScreen('menu')} />}
    </div>
  );
}

// ─────────────────────────────────────────────
//  ESTILOS — MENU
// ─────────────────────────────────────────────
const m = {
  screen: { position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'radial-gradient(ellipse at 50% 40%, #1a1020 0%, #0a0a0f 70%)', overflow:'hidden' },
  scanline: { position:'absolute', left:0, right:0, height:'3px',
              background:'linear-gradient(transparent, rgba(255,107,0,0.15), transparent)',
              animation:'scanline 4s linear infinite', pointerEvents:'none', zIndex:1 },
  grid: { position:'absolute', inset:0,
          backgroundImage:`linear-gradient(rgba(255,107,0,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(255,107,0,0.04) 1px, transparent 1px)`,
          backgroundSize:'40px 40px', pointerEvents:'none' },
  content: { position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center',
             gap:'28px', padding:'40px 24px', animation:'fadeUp 0.7s ease both' },
  handIcon: { fontSize:'4rem', animation:'float 3s ease-in-out infinite', filter:'drop-shadow(0 0 20px rgba(255,107,0,0.5))' },
  titleBlock: { textAlign:'center' },
  title: { display:'block', fontFamily:'Black Ops One, cursive', fontSize:'clamp(3.5rem, 10vw, 6rem)',
           color:'#ff6b00', letterSpacing:'0.15em', textShadow:'0 0 40px rgba(255,107,0,0.6), 0 0 80px rgba(255,107,0,0.2)', lineHeight:1 },
  subtitle: { display:'block', fontFamily:'Share Tech Mono, monospace', fontSize:'clamp(0.7rem, 2vw, 1rem)',
              color:'#8888aa', letterSpacing:'0.5em', marginTop:'6px' },
  titleLine: { height:'2px', background:'linear-gradient(90deg, transparent, #ff6b00, transparent)', marginTop:'12px', borderRadius:'2px' },
  desc: { fontFamily:'Rajdhani, sans-serif', fontSize:'1.05rem', color:'#c0c0d8', textAlign:'center', lineHeight:1.7 },
  playBtn: { padding:'16px 56px', background:'#ff6b00', border:'none', borderRadius:'50px', cursor:'pointer',
             transition:'all 0.2s ease', boxShadow:'0 0 20px rgba(255,107,0,0.4)', marginTop:'8px' },
  playBtnHover: { transform:'scale(1.06)', boxShadow:'0 0 36px rgba(255,107,0,0.7)' },
  playBtnText: { fontFamily:'Black Ops One, cursive', fontSize:'1.4rem', color:'#000', letterSpacing:'0.15em' },
  trainBtn: { marginTop:'14px', padding:'10px 28px', background:'transparent', border:'1.5px solid #ffaa00',
              borderRadius:'50px', color:'#ffaa00', fontFamily:'system-ui, sans-serif', fontSize:'0.9rem',
              fontWeight:600, cursor:'pointer', letterSpacing:'0.05em' },
  legend: { display:'flex', flexDirection:'column', gap:'8px', background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'16px 24px' },
  legendRow: { display:'flex', alignItems:'center', gap:'10px', fontFamily:'Rajdhani, sans-serif', fontSize:'0.88rem', color:'#9999bb' },
  legendDot: { width:'12px', height:'12px', borderRadius:'3px', flexShrink:0 },
  footer: { fontFamily:'Share Tech Mono, monospace', fontSize:'0.7rem', color:'#44446a', letterSpacing:'0.15em' },
};

// ─────────────────────────────────────────────
//  ESTILOS — JOGO
// ─────────────────────────────────────────────
const g = {
  screen: { minHeight:'100vh', display:'flex', flexDirection:'column', background:'#0a0a0f', color:'#e8e8f0' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px',
            borderBottom:'1px solid #1a1a2e', background:'#0f0f18', gap:'12px', flexShrink:0 },
  voltarBtn: { padding:'8px 16px', background:'rgba(255,255,255,0.05)', border:'1px solid #2a2a3e',
               borderRadius:'8px', color:'#8888aa', fontFamily:'Rajdhani, sans-serif', fontWeight:700,
               fontSize:'0.85rem', cursor:'pointer', letterSpacing:'0.1em', transition:'all 0.2s ease', whiteSpace:'nowrap' },
  titleBlock: { display:'flex', flexDirection:'column', alignItems:'center', lineHeight:1 },
  title: { fontFamily:'Black Ops One, cursive', fontSize:'1.4rem', color:'#ff6b00', letterSpacing:'0.12em', textShadow:'0 0 16px rgba(255,107,0,0.5)' },
  titleSub: { fontFamily:'Share Tech Mono, monospace', fontSize:'0.55rem', color:'#55557a', letterSpacing:'0.35em' },
  attempts: { display:'flex', flexDirection:'column', alignItems:'center', lineHeight:1.1 },
  attemptsNum: { fontFamily:'Black Ops One, cursive', fontSize:'1.5rem', color:'#ff6b00' },
  attemptsLabel: { fontFamily:'Share Tech Mono, monospace', fontSize:'0.55rem', color:'#55557a', letterSpacing:'0.1em' },
  toast: { position:'fixed', top:'70px', left:'50%', transform:'translateX(-50%)', background:'#e8e8f0',
           color:'#0a0a0f', padding:'10px 24px', borderRadius:'8px', fontFamily:'Black Ops One, cursive',
           fontSize:'1rem', letterSpacing:'0.08em', zIndex:300, boxShadow:'0 6px 24px rgba(0,0,0,0.6)',
           whiteSpace:'nowrap', animation:'slideDown 0.3s ease' },
  body: { flex:1, display:'flex', gap:'24px', padding:'20px', justifyContent:'center', alignItems:'flex-start', flexWrap:'wrap' },
  leftCol: { display:'flex', flexDirection:'column', gap:'12px', alignItems:'center', flex:'0 0 auto', maxWidth:'440px', width:'100%' },
  rightCol: { display:'flex', flexDirection:'column', gap:'20px', alignItems:'center', flex:'1 1 300px', maxWidth:'480px', width:'100%' },
  history: { display:'flex', flexDirection:'column', gap:'5px', width:'100%', alignItems:'center' },
  historyRow: { display:'flex', gap:'6px' },
  historyCell: { width:'42px', height:'42px', display:'flex', alignItems:'center', justifyContent:'center',
                 borderRadius:'6px', fontFamily:'Black Ops One, cursive', fontSize:'1.2rem' },
  slotsRow: { display:'flex', gap:'16px', justifyContent:'center' },
  slot: { width:'90px', height:'90px', display:'flex', alignItems:'center', justifyContent:'center',
          borderRadius:'12px', fontFamily:'Black Ops One, cursive', fontSize:'3rem', userSelect:'none' },
  actionRow: { display:'flex', gap:'12px', width:'100%', justifyContent:'center' },
  delBtn: { flex:1, maxWidth:'160px', padding:'12px', background:'rgba(255,34,68,0.1)', border:'1px solid #3a3a5c',
            borderRadius:'10px', color:'#cc4466', fontFamily:'Rajdhani, sans-serif', fontWeight:700,
            fontSize:'0.9rem', cursor:'pointer', letterSpacing:'0.08em', transition:'all 0.2s ease' },
  enterBtn: { flex:2, maxWidth:'240px', padding:'12px', background:'#ff6b00', border:'none', borderRadius:'10px',
              color:'#000', fontFamily:'Black Ops One, cursive', fontSize:'1rem', cursor:'pointer',
              letterSpacing:'0.1em', boxShadow:'0 0 20px rgba(255,107,0,0.4)', transition:'all 0.2s ease' },

  // ── Botão e painel do alfabeto LGP (movidos para aqui a partir da Camera) ──
  alphabetBtn: { marginTop:'4px', padding:'10px 20px', width:'100%', maxWidth:'280px',
                 background:'rgba(255,255,255,0.05)', border:'1px solid #2a2a3e', borderRadius:'10px',
                 color:'#8888aa', fontFamily:'Rajdhani, sans-serif', fontWeight:700, fontSize:'0.85rem',
                 letterSpacing:'0.05em', cursor:'pointer', transition:'all 0.2s ease' },
  alphabetBtnActive: { background:'#ff6b00', borderColor:'#ff6b00', color:'#000' },
  alphabetPanel: { width:'100%', display:'flex', flexDirection:'column', gap:'10px',
                   background:'rgba(255,255,255,0.03)', border:'1px solid #2a2a3e', borderRadius:'12px',
                   padding:'14px', animation:'panelFadeIn 0.25s ease' },
  alphabetHead: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  alphabetTitle: { fontFamily:'Black Ops One, cursive', fontSize:'0.85rem', color:'#ff6b00', letterSpacing:'0.04em' },
  alphabetGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(38px, 1fr))', gap:'5px' },
  alphabetChip: { padding:'8px 2px', borderRadius:'6px', textAlign:'center', fontFamily:'Black Ops One, cursive',
                  fontSize:'0.95rem', userSelect:'none', cursor:'pointer', transition:'all 0.12s ease' },
  alphabetDetail: { display:'flex', alignItems:'center', gap:'12px', background:'rgba(255,107,0,.07)',
                    border:'1px solid rgba(255,107,0,.22)', borderRadius:'10px', padding:'10px' },
  alphabetDetailText: { display:'flex', flexDirection:'column', gap:'4px', flex:1, minWidth:0 },
  alphabetDetailLetter: { fontFamily:'Black Ops One, cursive', fontSize:'2rem', color:'#ff6b00', lineHeight:1 },
  alphabetDetailDesc: { fontFamily:'Share Tech Mono, monospace', fontSize:'0.65rem', color:'#8888aa', lineHeight:1.4, wordBreak:'break-word' },
  alphabetDetailOk: { fontFamily:'Share Tech Mono, monospace', fontSize:'0.68rem', color:'#39ff14', marginTop:'2px' },

  gameOverBlock: { display:'flex', flexDirection:'column', alignItems:'center', gap:'14px' },
  gameOverBadge: { fontFamily:'Black Ops One, cursive', fontSize:'1.4rem', padding:'12px 28px',
                   border:'2px solid', borderRadius:'10px', letterSpacing:'0.1em' },
  newGameBtn: { padding:'12px 32px', background:'#ff6b00', border:'none', borderRadius:'10px', color:'#000',
                fontFamily:'Black Ops One, cursive', fontSize:'1rem', cursor:'pointer',
                letterSpacing:'0.1em', boxShadow:'0 0 20px rgba(255,107,0,0.4)' },
};