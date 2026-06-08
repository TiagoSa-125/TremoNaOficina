import React from 'react';

const COLORS = {
  correct: { bg: '#39ff14', border: '#39ff14', text: '#0a0a0f' },
  present: { bg: '#ffd700', border: '#ffd700', text: '#0a0a0f' },
  absent:  { bg: '#2a2a3e', border: '#3a3a5c', text: '#8888aa' },
  empty:   { bg: 'transparent', border: '#2a2a3e', text: 'transparent' },
  active:  { bg: 'transparent', border: '#ff6b00', text: '#e8e8f0' },
};

function Cell({ letter, state, isFlipping, delay }) {
  const color = COLORS[state] || COLORS.empty;

  return (
    <div
      style={{
        ...styles.cell,
        background: color.bg,
        border: `2px solid ${color.border}`,
        color: color.text,
        animation: isFlipping ? `flipIn 0.5s ease ${delay}ms forwards` : 'none',
        transform: letter && state === 'active' ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.1s ease, border-color 0.2s ease',
        boxShadow: state === 'correct'
          ? '0 0 12px rgba(57,255,20,0.4)'
          : state === 'present'
          ? '0 0 12px rgba(255,215,0,0.4)'
          : state === 'active'
          ? '0 0 8px rgba(255,107,0,0.3)'
          : 'none',
      }}
    >
      {letter}
    </div>
  );
}

export default function GameBoard({ guesses, currentGuess, maxTries, wordLength, shake }) {
  const rows = [];

  // Tentativas já feitas
  for (let i = 0; i < guesses.length; i++) {
    const guess = guesses[i];
    rows.push(
      <div key={`guess-${i}`} style={styles.row}>
        {guess.word.split('').map((letter, j) => (
          <Cell
            key={j}
            letter={letter}
            state={guess.evaluation[j]}
            isFlipping={true}
            delay={j * 120}
          />
        ))}
      </div>
    );
  }

  // Linha atual
  if (guesses.length < maxTries) {
    const currentRow = [];
    for (let j = 0; j < wordLength; j++) {
      const letter = currentGuess[j] || '';
      currentRow.push(
        <Cell
          key={j}
          letter={letter}
          state={letter ? 'active' : 'empty'}
        />
      );
    }
    rows.push(
      <div
        key="current"
        style={{
          ...styles.row,
          animation: shake ? 'shake 0.5s ease' : 'none',
        }}
      >
        {currentRow}
      </div>
    );
  }

  // Linhas vazias restantes
  const emptyRows = maxTries - guesses.length - (guesses.length < maxTries ? 1 : 0);
  for (let i = 0; i < emptyRows; i++) {
    rows.push(
      <div key={`empty-${i}`} style={styles.row}>
        {Array(wordLength).fill(null).map((_, j) => (
          <Cell key={j} letter="" state="empty" />
        ))}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes flipIn {
          0% { transform: rotateX(0deg); }
          50% { transform: rotateX(-90deg); opacity: 0.5; }
          100% { transform: rotateX(0deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
      {rows}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
  },
  row: {
    display: 'flex',
    gap: '6px',
  },
  cell: {
    width: '62px',
    height: '62px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-title)',
    fontSize: '1.8rem',
    fontWeight: 'bold',
    borderRadius: '6px',
    userSelect: 'none',
    perspective: '200px',
  },
};
