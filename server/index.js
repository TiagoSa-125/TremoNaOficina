const express = require('express');
const cors = require('cors');
const words = require('./words.json');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Remover acentos e normalizar palavra
function normalize(word) {
  return word.toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Retorna palavra aleatória do dia (muda a cada dia)
app.get('/api/word', (req, res) => {
  const validWords = words.filter(w => w.replace(/[^A-Za-zÀ-ú]/g, '').length === 4);
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = seed % validWords.length;
  const word = validWords[index];
  res.json({ word: normalize(word) });
});

// Retorna palavra aleatória (para novo jogo)
app.get('/api/word/random', (req, res) => {
  const validWords = words.filter(w => w.replace(/[^A-Za-zÀ-ú]/g, '').length === 4);
  const word = validWords[Math.floor(Math.random() * validWords.length)];
  res.json({ word: normalize(word) });
});

// Verifica se palavra existe na lista
app.post('/api/validate', (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Palavra em falta' });
  const normalized = normalize(word);
  const validWords = words.map(w => normalize(w));
  const valid = validWords.includes(normalized);
  res.json({ valid });
});

// Lista todas as palavras (para validação local)
app.get('/api/words', (req, res) => {
  const validWords = words
    .filter(w => w.replace(/[^A-Za-zÀ-ú]/g, '').length === 4)
    .map(w => normalize(w));
  res.json({ words: validWords });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`🟢 Servidor TREMU NA OFICINA a correr na porta ${PORT}`);
});
