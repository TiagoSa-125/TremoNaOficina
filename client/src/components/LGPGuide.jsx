import React, { useState } from 'react';

// Descrições dos gestos LGP para cada letra
const LGP_GUIDE = {
  A: { emoji: '✊', desc: 'Mão fechada, polegar ao lado' },
  B: { emoji: '🖐', desc: '4 dedos juntos para cima, polegar dobrado' },
  C: { emoji: '🤏', desc: 'Mão em forma de C' },
  D: { emoji: '☝️', desc: 'Indicador para cima, polegar toca no médio' },
  E: { emoji: '🤞', desc: 'Dedos dobrados, polegar toca no indicador' },
  F: { emoji: '👌', desc: 'Polegar+indicador em círculo, outros estendidos' },
  G: { emoji: '👉', desc: 'Indicador e polegar apontam para o lado' },
  H: { emoji: '✌️', desc: 'Indicador e médio horizontais' },
  I: { emoji: '🤙', desc: 'Só o mindinho estendido' },
  J: { emoji: '🤙', desc: 'Mindinho estendido + polegar para fora' },
  K: { emoji: '✌️', desc: 'Indicador e médio em V, polegar entre eles' },
  L: { emoji: '👆', desc: 'Polegar e indicador em forma de L' },
  M: { emoji: '✊', desc: '3 dedos dobrados sobre o polegar' },
  N: { emoji: '✊', desc: '2 dedos dobrados sobre o polegar' },
  O: { emoji: '👌', desc: 'Polegar e indicador formam círculo' },
  P: { emoji: '👇', desc: 'Indicador aponta para baixo, polegar estendido' },
  Q: { emoji: '👇', desc: 'Indicador e polegar apontam para baixo' },
  R: { emoji: '🤞', desc: 'Indicador e médio cruzados' },
  S: { emoji: '✊', desc: 'Mão fechada, polegar sobre os dedos' },
  T: { emoji: '✊', desc: 'Polegar entre indicador e médio' },
  U: { emoji: '✌️', desc: 'Indicador e médio juntos e estendidos' },
  V: { emoji: '✌️', desc: 'Indicador e médio em V aberto' },
  W: { emoji: '🖖', desc: 'Indicador, médio e anelar estendidos' },
  X: { emoji: '☝️', desc: 'Indicador dobrado em gancho' },
  Y: { emoji: '🤙', desc: 'Polegar e mindinho estendidos' },
  Z: { emoji: '☝️', desc: 'Indicador estendido (desenha Z)' },
};

export default function LGPGuide() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const letters = Object.entries(LGP_GUIDE).filter(([letter]) =>
    search === '' || letter === search.toUpperCase()
  );

  return (
    <div style={styles.container}>
      <button
        style={styles.toggleBtn}
        onClick={() => setOpen(!open)}
      >
        {open ? '✕ Fechar Guia' : '📖 Guia Gestos LGP'}
      </button>

      {open && (
        <div style={styles.panel}>
          <h3 style={styles.title}>Alfabeto Manual Português (LGP)</h3>
          <input
            style={styles.search}
            placeholder="Pesquisar letra..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            maxLength={1}
          />
          <div style={styles.grid}>
            {letters.map(([letter, info]) => (
              <div key={letter} style={styles.card}>
                <span style={styles.cardEmoji}>{info.emoji}</span>
                <span style={styles.cardLetter}>{letter}</span>
                <span style={styles.cardDesc}>{info.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '500px',
  },
  toggleBtn: {
    width: '100%',
    padding: '8px 16px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text2)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  panel: {
    marginTop: '8px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '16px',
  },
  title: {
    fontFamily: 'var(--font-title)',
    color: 'var(--accent)',
    fontSize: '1rem',
    marginBottom: '12px',
    letterSpacing: '0.05em',
  },
  search: {
    width: '100%',
    padding: '6px 10px',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    marginBottom: '12px',
    outline: 'none',
    textTransform: 'uppercase',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  card: {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    textAlign: 'center',
  },
  cardEmoji: {
    fontSize: '1.4rem',
  },
  cardLetter: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.2rem',
    color: 'var(--accent)',
  },
  cardDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: 'var(--text2)',
    lineHeight: '1.3',
  },
};
