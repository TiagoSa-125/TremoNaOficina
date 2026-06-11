import React, { useState, useEffect, useCallback } from 'react';
import Camera from './components/Camera';
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
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Scanline animada */}
      <div style={m.scanline} />

      {/* Grid de fundo */}
      <div style={m.grid} />

      {/* Conteúdo central */}
      <div style={m.content}>

        {/* Ícone de mão a flutuar */}
        <div style={m.handIcon}>🤟</div>

        {/* Título */}
        <div style={m.titleBlock}>
          <h1 style={m.title}>TREMU</h1>
          <p style={m.subtitle}>NA OFICINA</p>
          <div style={m.titleLine} />
        </div>

        {/* Descrição */}
        <p style={m.desc}>
          Adivinha palavras de <strong style={{ color: '#ff6b00' }}>4 letras</strong><br />
          usando <strong style={{ color: '#ffaa00' }}>Linguagem Gestual Portuguesa</strong>
        </p>

        {/* Botão JOGAR */}
        <button
          style={{ ...m.playBtn, ...(hovered ? m.playBtnHover : {}) }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onPlay}
        >
          <span style={m.playBtnText}>▶ JOGAR</span>
        </button>

        {/* Botão TREINO */}
        <button
          style={m.trainBtn}
          onClick={onTrain}
        >
          🎓 Modo de Treino (gestos)
        </button>

        {/* Legenda rápida */}
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

        {/* Rodapé */}
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
    guesses, currentGuess, gameStatus, loading,
    addLetter, deleteLetter, submitGuess, resetGame,
    wordLength, targetWord,
  } = useGame();

  // Estado de feedback por slot (null | 'correct' | 'wrong' | 'absent')
  const [slotFeedback, setSlotFeedback] = useState([null, null, null, null]);
  const [showFeedback, setShowFeedback] = useState(false);
  // Letras confirmadas que ficam permanentemente
  const [confirmedLetters, setConfirmedLetters] = useState([null, null, null, null]);
  const [toast, setToast] = useState('');
  const [lastGuessResult, setLastGuessResult] = useState(null);

  const showToast = useCallback((msg, dur = 2200) => {
    setToast(msg);
    setTimeout(() => setToast(''), dur);
  }, []);

  // Keyboard físico
  useEffect(() => {
    const h = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Enter') handleSubmit();
      else if (e.key === 'Backspace') deleteLetter();
      else if (/^[a-zA-ZÀ-ú]$/.test(e.key)) addLetter(e.key.toUpperCase());
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [addLetter, deleteLetter]);

  // Quando muda guesses (nova tentativa submetida), calcular feedback
  useEffect(() => {
    if (guesses.length === 0) return;
    const last = guesses[guesses.length - 1];
    setLastGuessResult(last);

    // feedback visual por posição
    const fb = last.evaluation.map(e => e); // 'correct' | 'present' | 'absent'
    setSlotFeedback(fb);
    setShowFeedback(true);

    // Letras corretas ficam confirmadas
    const newConfirmed = [...confirmedLetters];
    last.word.split('').forEach((letter, i) => {
      if (last.evaluation[i] === 'correct') newConfirmed[i] = letter;
    });
    setConfirmedLetters(newConfirmed);

    // Após 1.2s limpa feedback e reseta (mas letras corretas ficam)
    const t = setTimeout(() => {
      setShowFeedback(false);
      setSlotFeedback([null, null, null, null]);
      if (gameStatus === 'won') {
        showToast('🏆 PALAVRA CERTA! GANHOU!', 3000);
      } else if (gameStatus === 'lost') {
        showToast(`Era: ${targetWord}`, 3500);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [guesses.length]);

  // Mensagens de estado
  useEffect(() => {
    if (gameStatus === 'won') showToast('🏆 ESPETACULAR! GANHOU!', 3000);
    if (gameStatus === 'lost') showToast(`💀 Era: ${targetWord}`, 3500);
  }, [gameStatus]);

  const handleSubmit = useCallback(() => {
    if (currentGuess.length < wordLength) {
      showToast('Precisa de 4 letras!');
      return;
    }
    submitGuess();
  }, [currentGuess, wordLength, submitGuess, showToast]);

  const handleReset = useCallback(() => {
    setConfirmedLetters([null, null, null, null]);
    setSlotFeedback([null, null, null, null]);
    setShowFeedback(false);
    setLastGuessResult(null);
    resetGame();
  }, [resetGame]);

  // Letras a mostrar nos slots: confirmadas > currentGuess > vazio
  const displayLetters = [0, 1, 2, 3].map(i => {
    if (confirmedLetters[i]) return confirmedLetters[i];
    if (currentGuess[i]) return currentGuess[i];
    return '';
  });

  // Cor de cada slot
  const slotColor = (i) => {
    if (showFeedback && slotFeedback[i]) {
      if (slotFeedback[i] === 'correct') return { bg: '#39ff14', border: '#39ff14', text: '#000', glow: 'rgba(57,255,20,0.5)' };
      if (slotFeedback[i] === 'present') return { bg: '#ffd700', border: '#ffd700', text: '#000', glow: 'rgba(255,215,0,0.5)' };
      if (slotFeedback[i] === 'absent')  return { bg: '#ff2244', border: '#ff2244', text: '#fff', glow: 'rgba(255,34,68,0.5)' };
    }
    if (confirmedLetters[i]) return { bg: 'rgba(57,255,20,0.15)', border: '#39ff14', text: '#39ff14', glow: 'rgba(57,255,20,0.2)' };
    if (displayLetters[i])   return { bg: 'rgba(255,107,0,0.1)', border: '#ff6b00', text: '#ff6b00', glow: 'rgba(255,107,0,0.2)' };
    return { bg: 'transparent', border: '#2a2a3e', text: 'transparent', glow: 'none' };
  };

  const attemptsLeft = 6 - guesses.length;

  return (
    <div style={g.screen}>
      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-10px); }
          40%     { transform: translateX(10px); }
          60%     { transform: translateX(-7px); }
          80%     { transform: translateX(7px); }
        }
        @keyframes feedbackPulse {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity:0; transform: translateY(-20px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .slot-animate { animation: feedbackPulse 0.4s ease forwards; }
        .voltar-btn:hover { background: rgba(255,107,0,0.15) !important; border-color: #ff6b00 !important; color: #ff6b00 !important; }
        .jogar-btn:hover { transform: scale(1.04); box-shadow: 0 0 28px rgba(255,107,0,0.7) !important; }
        .del-btn:hover { background: rgba(255,34,68,0.2) !important; border-color: #ff2244 !important; }
      `}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={g.toast}>{toast}</div>
      )}

      {/* ── HEADER ── */}
      <div style={g.header}>
        <button className="voltar-btn" style={g.voltarBtn} onClick={onBack}>
          ← VOLTAR
        </button>
        <div style={g.titleBlock}>
          <span style={g.title}>TREMU</span>
          <span style={g.titleSub}>NA OFICINA</span>
        </div>
        <div style={g.attempts}>
          <span style={g.attemptsNum}>{attemptsLeft}</span>
          <span style={g.attemptsLabel}>tentativas</span>
        </div>
      </div>

      {/* ── CORPO PRINCIPAL ── */}
      <div style={g.body}>

        {/* ── LADO ESQUERDO: câmara ── */}
        <div style={g.leftCol}>
          <Camera
            onLetterDetected={addLetter}
            active={gameStatus === 'playing'}
            currentGuessLength={currentGuess.length}
            wordLength={wordLength}
          />
        </div>

        {/* ── LADO DIREITO: jogo ── */}
        <div style={g.rightCol}>

          {/* Histórico de tentativas */}
          {guesses.length > 0 && (
            <div style={g.history}>
              {guesses.map((guess, gi) => (
                <div key={gi} style={g.historyRow}>
                  {guess.word.split('').map((letter, li) => {
                    const c = guess.evaluation[li];
                    return (
                      <div key={li} style={{
                        ...g.historyCell,
                        background: c === 'correct' ? '#39ff14' : c === 'present' ? '#ffd700' : '#2a2a3e',
                        color:      c === 'correct' ? '#000'    : c === 'present' ? '#000'    : '#666',
                        border:     `1px solid ${c === 'correct' ? '#39ff14' : c === 'present' ? '#ffd700' : '#3a3a5c'}`,
                      }}>
                        {letter}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ── 4 SLOTS GRANDES (palavra atual) ── */}
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
                    transition: 'all 0.2s ease',
                  }}
                >
                  {letter || ''}
                </div>
              );
            })}
          </div>

          {/* ── BOTÕES DE AÇÃO ── */}
          {gameStatus === 'playing' ? (
            <div style={g.actionRow}>
              <button
                className="del-btn"
                style={g.delBtn}
                onClick={deleteLetter}
                disabled={currentGuess.length === 0}
              >
                ⌫ APAGAR
              </button>
              <button
                className="jogar-btn"
                style={{
                  ...g.enterBtn,
                  opacity: currentGuess.length < wordLength ? 0.5 : 1,
                  cursor: currentGuess.length < wordLength ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSubmit}
                disabled={currentGuess.length < wordLength}
              >
                CONFIRMAR ✓
              </button>
            </div>
          ) : (
            <div style={g.gameOverBlock}>
              <div style={{
                ...g.gameOverBadge,
                borderColor: gameStatus === 'won' ? '#39ff14' : '#ff2244',
                color:       gameStatus === 'won' ? '#39ff14' : '#ff2244',
                boxShadow:   gameStatus === 'won' ? '0 0 24px rgba(57,255,20,0.3)' : '0 0 24px rgba(255,34,68,0.3)',
              }}>
                {gameStatus === 'won' ? '🏆 GANHOU!' : `💀 Era: ${targetWord}`}
              </div>
              <button style={g.newGameBtn} onClick={handleReset}>
                ↺ NOVO JOGO
              </button>
            </div>
          )}

          {/* Teclado virtual auxiliar */}
          <div style={g.keyboardSection}>
            <p style={g.keyboardLabel}>— ou escreve com o teclado —</p>
            {[
              ['Q','W','E','R','T','Y','U','I','O','P'],
              ['A','S','D','F','G','H','J','K','L'],
              ['Z','X','C','V','B','N','M'],
            ].map((row, ri) => (
              <div key={ri} style={g.kbRow}>
                {row.map(k => (
                  <button key={k} style={g.kbKey} onClick={() => addLetter(k)}>{k}</button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ROOT — controla qual ecrã está ativo
// ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('menu'); // 'menu' | 'game' | 'train'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {screen === 'menu' && (
        <MenuScreen onPlay={() => setScreen('game')} onTrain={() => setScreen('train')} />
      )}
      {screen === 'game' && <GameScreen onBack={() => setScreen('menu')} />}
      {screen === 'train' && <TrainingMode onBack={() => setScreen('menu')} />}
    </div>
  );
}

// ─────────────────────────────────────────────
//  ESTILOS — MENU
// ─────────────────────────────────────────────
const m = {
  screen: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 40%, #1a1020 0%, #0a0a0f 70%)',
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    left: 0, right: 0,
    height: '3px',
    background: 'linear-gradient(transparent, rgba(255,107,0,0.15), transparent)',
    animation: 'scanline 4s linear infinite',
    pointerEvents: 'none',
    zIndex: 1,
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,107,0,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,107,0,0.04) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '28px',
    padding: '40px 24px',
    animation: 'fadeUp 0.7s ease both',
  },
  handIcon: {
    fontSize: '4rem',
    animation: 'float 3s ease-in-out infinite',
    filter: 'drop-shadow(0 0 20px rgba(255,107,0,0.5))',
  },
  titleBlock: {
    textAlign: 'center',
  },
  title: {
    display: 'block',
    fontFamily: 'Black Ops One, cursive',
    fontSize: 'clamp(3.5rem, 10vw, 6rem)',
    color: '#ff6b00',
    letterSpacing: '0.15em',
    textShadow: '0 0 40px rgba(255,107,0,0.6), 0 0 80px rgba(255,107,0,0.2)',
    lineHeight: 1,
  },
  subtitle: {
    display: 'block',
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 'clamp(0.7rem, 2vw, 1rem)',
    color: '#8888aa',
    letterSpacing: '0.5em',
    marginTop: '6px',
  },
  titleLine: {
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #ff6b00, transparent)',
    marginTop: '12px',
    borderRadius: '2px',
  },
  desc: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: '1.05rem',
    color: '#c0c0d8',
    textAlign: 'center',
    lineHeight: 1.7,
  },
  playBtn: {
    padding: '16px 56px',
    background: '#ff6b00',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 0 20px rgba(255,107,0,0.4)',
    marginTop: '8px',
  },
  playBtnHover: {
    transform: 'scale(1.06)',
    boxShadow: '0 0 36px rgba(255,107,0,0.7)',
  },
  playBtnText: {
    fontFamily: 'Black Ops One, cursive',
    fontSize: '1.4rem',
    color: '#000',
    letterSpacing: '0.15em',
  },
  trainBtn: {
    marginTop: '14px',
    padding: '10px 28px',
    background: 'transparent',
    border: '1.5px solid #ffaa00',
    borderRadius: '50px',
    color: '#ffaa00',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.05em',
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '16px 24px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: '0.88rem',
    color: '#9999bb',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  footer: {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: '0.7rem',
    color: '#44446a',
    letterSpacing: '0.15em',
  },
};

// ─────────────────────────────────────────────
//  ESTILOS — JOGO
// ─────────────────────────────────────────────
const g = {
  screen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a0f',
    color: '#e8e8f0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderBottom: '1px solid #1a1a2e',
    background: '#0f0f18',
    gap: '12px',
    flexShrink: 0,
  },
  voltarBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid #2a2a3e',
    borderRadius: '8px',
    color: '#8888aa',
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    letterSpacing: '0.1em',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1,
  },
  title: {
    fontFamily: 'Black Ops One, cursive',
    fontSize: '1.4rem',
    color: '#ff6b00',
    letterSpacing: '0.12em',
    textShadow: '0 0 16px rgba(255,107,0,0.5)',
  },
  titleSub: {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: '0.55rem',
    color: '#55557a',
    letterSpacing: '0.35em',
  },
  attempts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1.1,
  },
  attemptsNum: {
    fontFamily: 'Black Ops One, cursive',
    fontSize: '1.5rem',
    color: '#ff6b00',
  },
  attemptsLabel: {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: '0.55rem',
    color: '#55557a',
    letterSpacing: '0.1em',
  },
  toast: {
    position: 'fixed',
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#e8e8f0',
    color: '#0a0a0f',
    padding: '10px 24px',
    borderRadius: '8px',
    fontFamily: 'Black Ops One, cursive',
    fontSize: '1rem',
    letterSpacing: '0.08em',
    zIndex: 300,
    boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
    whiteSpace: 'nowrap',
    animation: 'slideDown 0.3s ease',
  },
  body: {
    flex: 1,
    display: 'flex',
    gap: '24px',
    padding: '20px',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
    flex: '0 0 auto',
    maxWidth: '440px',
    width: '100%',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'center',
    flex: '1 1 300px',
    maxWidth: '480px',
  },
  // Histórico compacto
  history: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    width: '100%',
    alignItems: 'center',
  },
  historyRow: {
    display: 'flex',
    gap: '6px',
  },
  historyCell: {
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    fontFamily: 'Black Ops One, cursive',
    fontSize: '1.2rem',
  },
  // 4 slots grandes
  slotsRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  slot: {
    width: '90px',
    height: '90px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    fontFamily: 'Black Ops One, cursive',
    fontSize: '3rem',
    userSelect: 'none',
  },
  // Botões ação
  actionRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    justifyContent: 'center',
  },
  delBtn: {
    flex: 1,
    maxWidth: '160px',
    padding: '12px',
    background: 'rgba(255,34,68,0.1)',
    border: '1px solid #3a3a5c',
    borderRadius: '10px',
    color: '#cc4466',
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    letterSpacing: '0.08em',
    transition: 'all 0.2s ease',
  },
  enterBtn: {
    flex: 2,
    maxWidth: '240px',
    padding: '12px',
    background: '#ff6b00',
    border: 'none',
    borderRadius: '10px',
    color: '#000',
    fontFamily: 'Black Ops One, cursive',
    fontSize: '1rem',
    cursor: 'pointer',
    letterSpacing: '0.1em',
    boxShadow: '0 0 20px rgba(255,107,0,0.4)',
    transition: 'all 0.2s ease',
  },
  // Game over
  gameOverBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  },
  gameOverBadge: {
    fontFamily: 'Black Ops One, cursive',
    fontSize: '1.4rem',
    padding: '12px 28px',
    border: '2px solid',
    borderRadius: '10px',
    letterSpacing: '0.1em',
  },
  newGameBtn: {
    padding: '12px 32px',
    background: '#ff6b00',
    border: 'none',
    borderRadius: '10px',
    color: '#000',
    fontFamily: 'Black Ops One, cursive',
    fontSize: '1rem',
    cursor: 'pointer',
    letterSpacing: '0.1em',
    boxShadow: '0 0 20px rgba(255,107,0,0.4)',
  },
  // Teclado auxiliar
  keyboardSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  keyboardLabel: {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: '0.65rem',
    color: '#3a3a5c',
    letterSpacing: '0.1em',
    marginBottom: '4px',
  },
  kbRow: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  kbKey: {
    width: '34px',
    height: '40px',
    background: '#1a1a26',
    border: '1px solid #2a2a3e',
    borderRadius: '6px',
    color: '#c0c0d8',
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
