import React from 'react';

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

const STATE_COLORS = {
  correct: { bg: '#39ff14', color: '#0a0a0f', border: '#39ff14', shadow: 'rgba(57,255,20,0.3)' },
  present: { bg: '#ffd700', color: '#0a0a0f', border: '#ffd700', shadow: 'rgba(255,215,0,0.3)' },
  absent:  { bg: '#1a1a26', color: '#4a4a6a', border: '#2a2a3e', shadow: 'none' },
  default: { bg: '#2a2a3e', color: '#e8e8f0', border: '#3a3a5c', shadow: 'none' },
};

export default function Keyboard({ onLetter, onDelete, onEnter, letterStates }) {
  const handleClick = (key) => {
    if (key === 'ENTER') onEnter();
    else if (key === '⌫') onDelete();
    else onLetter(key);
  };

  return (
    <div style={styles.container}>
      {ROWS.map((row, i) => (
        <div key={i} style={styles.row}>
          {row.map((key) => {
            const state = letterStates[key];
            const colors = STATE_COLORS[state] || STATE_COLORS.default;
            const isSpecial = key === 'ENTER' || key === '⌫';

            return (
              <button
                key={key}
                onClick={() => handleClick(key)}
                style={{
                  ...styles.key,
                  ...(isSpecial ? styles.specialKey : {}),
                  background: colors.bg,
                  color: colors.color,
                  border: `1px solid ${colors.border}`,
                  boxShadow: colors.shadow !== 'none'
                    ? `0 0 8px ${colors.shadow}`
                    : 'none',
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
    width: '100%',
    maxWidth: '500px',
  },
  row: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  key: {
    minWidth: '36px',
    height: '48px',
    padding: '0 8px',
    borderRadius: '6px',
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.05em',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  specialKey: {
    minWidth: '58px',
    fontSize: '0.75rem',
    background: '#ff6b00',
    color: '#fff',
    border: '1px solid #ff8833',
  },
};
