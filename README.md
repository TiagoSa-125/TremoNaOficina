# 🤌 TREMU NA OFICINA

Jogo de palavras estilo Termo com **Linguagem Gestual Portuguesa (LGP)**.  
Adivinha palavras de **4 letras** usando gestos com a câmara!

---

## 🚀 Como correr no GitHub Codespaces

### 1. Abrir o Codespace
- No repositório GitHub, clica em **Code → Codespaces → New codespace**

### 2. Instalar dependências

# Na pasta raiz do projeto
npm install

# Instalar dependências do servidor
cd server && npm install && cd ..

# Instalar dependências do cliente
cd client && npm install && cd ..
```

# Ou tudo de uma vez:
npm run install:all


### 3. Correr a aplicação

# Corre servidor + cliente em simultâneo
npm run dev


- **Servidor** corre na porta `3001`
- **Cliente** corre na porta `3000`

### 4. Tornar público no Codespace

1. Vai ao painel **PORTS** (menu inferior do VS Code)
2. Clica com o botão direito na porta `3000` e `3001`
3. Seleciona **Port Visibility → Public**
4. Copia o URL e partilha!

Ou abre a app do vercel e joga 

---

## 🎮 Como Jogar

1. **Acede** à aplicação no browser
2. **Ativa a câmara** clicando em "Ativar Câmara LGP"
3. **Faz gestos** com a mão para inserir letras (Alfabeto Manual Português)
4. **Mantém o gesto** até a barra de progresso encher (≈1 segundo)
5. **Pressiona ENTER** (ou clica no teclado) quando tiveres 4 letras
6. Tens **6 tentativas** para acertar!

### Podes também usar:
- ⌨️ **Teclado físico** — escreve diretamente com enter e backspace para apagar e confirmar as letras
- 🖱️ **Teclado virtual** — clica nos botoes de apagar ou confirmar no ecrã

---


## 🛠 Tecnologias

- **Frontend:** React 18
- **Backend:** Node.js + Express
- **Deteção de gestos:** MediaPipe Hands (Google) — corre no browser, 100% offline
- **Palavras:** Lista de palavras portuguesas de 4 letras

---

## 📁 Estrutura do Projeto

```
tremu-na-oficina/
├── client/                  # React app
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Camera.jsx       # Câmara + MediaPipe
│       │   ├── GameBoard.jsx    # Grelha do jogo
│       │   ├── Keyboard.jsx     # Teclado virtual
│       ├── hooks/
│       │   ├── useGame.js           # Lógica do jogo
│       │   └── useGestureDetection.js # Deteção LGP
│       └── App.jsx
├── server/
│   ├── index.js             # API Express
│   └── words.json           # Base de palavras PT
└── package.json
```

---

**TREMU NA OFICINA** — Feito com ❤️ para inserção social através da linguagem gestual
