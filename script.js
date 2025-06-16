window.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.form');
  const difficulty = document.getElementById('difficulty');
  const gameboard = document.querySelector('.gameboard');
  const playAgain = document.querySelector('.play-again');
  let cards = [];
  let isWinner = false;
  let round = 1;
  let round1Selection, round2Selection;

  // Datos para los modos de juego (usa tus propias imágenes en producción)
  const themes = {
    animales: [
      { palabra: "perro", imagen: "images/animales/dog.png" },
      { palabra: "gato", imagen: "images/animales/cat.png" },
      { palabra: "pájaro", imagen: "images/animales/bird.png" },
      { palabra: "pez", imagen: "images/animales/clown-fish.png"},
    ],
    frutas: [
      { palabra: "manzana", imagen: "images/frutas/apple.png" },
      { palabra: "banana", imagen: "images/frutas/banana.png" },
      { palabra: "uva", imagen: "images/frutas/grape.png" },
      { palabra: "naranja", imagen: "images/frutas/oragen.png" },
    ]
  };
  // Generar cartas según el modo
  const generateCards = () => {
    const pairs = [];
    const themeData = themes[options.theme];

    if (options.mode === "classic") {
      // Modo clásico: pares de imágenes iguales
      for (let i = 0; i < options.difficulty; i++) {
        pairs.push({ tipo: "imagen", valor: themeData[i % themeData.length].imagen });
        pairs.push({ tipo: "imagen", valor: themeData[i % themeData.length].imagen });
      }
    } else if (options.mode === "word-image") {
      // Modo palabra-imagen
      for (let i = 0; i < options.difficulty; i++) {
        pairs.push({ tipo: "palabra", valor: themeData[i % themeData.length].palabra });
        pairs.push({ tipo: "imagen", valor: themeData[i % themeData.length].imagen });
      }
    } else if (options.mode === "image-image") {
      // Modo imagen-imagen relacionadas
      for (let i = 0; i < options.difficulty; i++) {
        pairs.push({ tipo: "imagen", valor: themeData[i % themeData.length].imagen });
        pairs.push({ tipo: "imagen", valor: `images/animales/hueso.png` }); // Ejemplo: "hueso"
      }
    }

    // Barajar las cartas (Fisher-Yates)
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs;
  };

  // Crear el tablero
  const createBoard = () => {
    gameboard.innerHTML = "";
    const cardsData = generateCards();
    cardsData.forEach((card) => {
      const cardElement = `
        <div class="card">
          <div class="card-inner">
            <div class="card-back"></div>
            ${card.tipo === "palabra" 
              ? `<p class="card-word">${card.valor}</p>` 
              : `<img class="card-front" src="${card.valor}" alt="${card.valor}">`
            }
          </div>
        </div>
      `;
      gameboard.insertAdjacentHTML("beforeend", cardElement);
    });
    cards = [...document.querySelectorAll('.card')];
    addCardListeners();
  };

  // Lógica de los clicks
  const cardClickEvent = (event) => {
    if (round === 1) {
      round1Selection = event.currentTarget;
      animateCard(round1Selection);
      round = 2;
    } else {
      round2Selection = event.currentTarget;
      animateCard(round2Selection);
      checkMatch();
    }
  };

  const checkMatch = () => {
    const card1 = round1Selection.querySelector('.card-word')?.textContent || 
                 round1Selection.querySelector('.card-front')?.alt;
    const card2 = round2Selection.querySelector('.card-word')?.textContent || 
                 round2Selection.querySelector('.card-front')?.alt;

    const isMatch = card1 === card2;

    if (isMatch) {
      round1Selection.classList.add('success');
      round2Selection.classList.add('success');
      isWinner = cards.every(card => card.classList.contains('animated'));
      if (isWinner) playAgain.classList.remove('hide');
    } else {
      round1Selection.classList.add('fail');
      round2Selection.classList.add('fail');
      setTimeout(() => {
        round1Selection.classList.remove('animated', 'fail');
        round2Selection.classList.remove('animated', 'fail');
      }, 1000);
    }
    round = 1;
  };

  const animateCard = (card) => card.classList.add('animated');
  const addCardListeners = () => cards.forEach(card => card.addEventListener('click', cardClickEvent));

  // Reiniciar juego
  playAgain.addEventListener('click', () => {
    gameboard.innerHTML = "";
    form.classList.remove('hide');
    playAgain.classList.add('hide');
  });

  // Iniciar juego
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    options.difficulty = difficulty.value;
    options.theme = document.querySelector('input[name="theme"]:checked').value;
    options.mode = document.querySelector('input[name="mode"]:checked').value;
    createBoard();
    form.classList.add('hide');
  });

  // Opciones iniciales
  const options = {
    difficulty: difficulty.value,
    theme: document.querySelector('input[name="theme"]:checked').value,
    mode: document.querySelector('input[name="mode"]:checked').value,
  };
});
