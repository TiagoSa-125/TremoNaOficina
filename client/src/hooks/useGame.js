import { useState, useEffect, useCallback } from 'react';

const MAX_TRIES = 6;
const WORD_LENGTH = 4;

export function useGame() {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState([]); // palavras já submetidas
  const [currentGuess, setCurrentGuess] = useState(''); // palavra atual
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [validWords, setValidWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState(false);

  // Carregar palavra e lista de palavras válidas
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [wordRes, wordsRes] = await Promise.all([
          fetch('/api/word'),
          fetch('/api/words')
        ]);
        const wordData = await wordRes.json();
        const wordsData = await wordsRes.json();
        setTargetWord(wordData.word.toUpperCase());
        setValidWords(wordsData.words.map(w => w.toUpperCase()));
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        // Fallback offline
        setTargetWord('GATO');
        setValidWords(['GATO', 'CASA', 'AMOR', 'VIDA', 'ÁGUA', 'BOLA', 'FOGO', 'MESA', 'NOTA', 'PATO']);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const showMessage = useCallback((msg, duration = 2000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

  // Avalia uma tentativa: 'correct' | 'present' | 'absent'
  const evaluateGuess = useCallback((guess) => {
    const result = Array(WORD_LENGTH).fill('absent');
    const targetArr = targetWord.split('');
    const guessArr = guess.split('');
    const targetUsed = Array(WORD_LENGTH).fill(false);
    const guessUsed = Array(WORD_LENGTH).fill(false);

    // 1ª passagem: corretos (posição certa)
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === targetArr[i]) {
        result[i] = 'correct';
        targetUsed[i] = true;
        guessUsed[i] = true;
      }
    }

    // 2ª passagem: presentes (letra certa, posição errada)
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessUsed[i]) continue;
      for (let j = 0; j < WORD_LENGTH; j++) {
        if (targetUsed[j]) continue;
        if (guessArr[i] === targetArr[j]) {
          result[i] = 'present';
          targetUsed[j] = true;
          break;
        }
      }
    }

    return result;
  }, [targetWord]);

  // Adicionar letra à palavra atual
  const addLetter = useCallback((letter) => {
    if (gameStatus !== 'playing') return;
    if (currentGuess.length >= WORD_LENGTH) return;
    setCurrentGuess(prev => prev + letter.toUpperCase());
  }, [currentGuess, gameStatus]);

  // Apagar última letra
  const deleteLetter = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setCurrentGuess(prev => prev.slice(0, -1));
  }, [gameStatus]);

  // Submeter tentativa
  const submitGuess = useCallback(() => {
    if (gameStatus !== 'playing') return;

    if (currentGuess.length < WORD_LENGTH) {
      showMessage('Palavra incompleta! Precisa de 4 letras.');
      triggerShake();
      return;
    }

    const evaluation = evaluateGuess(currentGuess);
    const newGuess = { word: currentGuess, evaluation };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (currentGuess === targetWord) {
      const msgs = ['ESPETACULAR! 🤌', 'FANTÁSTICO! 💪', 'INCRÍVEL! ⚡', 'MUITO BEM! 🎯'];
      showMessage(msgs[Math.floor(Math.random() * msgs.length)], 3000);
      setGameStatus('won');
    } else if (newGuesses.length >= MAX_TRIES) {
      showMessage(`Era: ${targetWord}`, 4000);
      setGameStatus('lost');
    }
  }, [currentGuess, guesses, gameStatus, targetWord, evaluateGuess, showMessage, triggerShake]);

  // Reiniciar com nova palavra aleatória
  const resetGame = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/word/random');
      const data = await res.json();
      setTargetWord(data.word.toUpperCase());
    } catch {
      const fallback = ['GATO', 'CASA', 'AMOR', 'VIDA', 'BOLA', 'FOGO', 'MESA', 'PATO'];
      setTargetWord(fallback[Math.floor(Math.random() * fallback.length)]);
    }
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
    setMessage('');
    setLoading(false);
  }, []);

  // Calcular estado de cada letra do teclado
  const letterStates = useCallback(() => {
    const states = {};
    for (const guess of guesses) {
      guess.word.split('').forEach((letter, i) => {
        const current = states[letter];
        const next = guess.evaluation[i];
        if (current === 'correct') return;
        if (current === 'present' && next !== 'correct') return;
        states[letter] = next;
      });
    }
    return states;
  }, [guesses]);

  return {
    targetWord,
    guesses,
    currentGuess,
    gameStatus,
    loading,
    message,
    shake,
    addLetter,
    deleteLetter,
    submitGuess,
    resetGame,
    letterStates: letterStates(),
    maxTries: MAX_TRIES,
    wordLength: WORD_LENGTH,
  };
}
