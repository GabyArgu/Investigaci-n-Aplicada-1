import React, { useEffect } from "react";
import Chatbot from "./components/Chatbot";


import charLeft1 from './assets/personaje.png';
import charLeft2 from './assets/personaje1.png';
import charLeft3 from './assets/personaje2.png';

import charRight1 from './assets/personaje1.png';
import charRight2 from './assets/personaje.png';
import charRight3 from './assets/personaje4.png';

import bubbleImage from './assets/burbuja.png'; 

function App() {
  const leftCharacterImages = [
    charLeft1,
    charLeft2,
    charLeft3
  ];

  const rightCharacterImages = [
    charRight1,
    charRight2,
    charRight3
  ];

  const unicodeEmojis = [
    '😀', '👍', '💡', '🚀', '🌟', '😊', '🎉', '💖', '🤩', '🥳', '✨', '🩺', '😷','🏥', '💊'
  ];

  useEffect(() => {
    const getRandomImage = (imageList) => {
      if (imageList.length === 0) {
        return null;
      }
      const randomIndex = Math.floor(Math.random() * imageList.length);
      return imageList[randomIndex];
    };

    const getRandomEmoji = (emojiList) => {
      if (emojiList.length === 0) {
        return null;
      }
      const randomIndex = Math.floor(Math.random() * emojiList.length);
      return emojiList[randomIndex];
    };

    // Crear y añadir los contenedores de personajes al body si no existen
    let leftCharContainer = document.querySelector('.character-left-container');
    let rightCharContainer = document.querySelector('.character-right-container');

    if (!leftCharContainer) {
      leftCharContainer = document.createElement('div');
      leftCharContainer.classList.add('character-left-container');
      document.body.appendChild(leftCharContainer);
    } else {
      leftCharContainer.innerHTML = ''; // Limpiar contenido previo
    }

    if (!rightCharContainer) {
      rightCharContainer = document.createElement('div');
      rightCharContainer.classList.add('character-right-container');
      document.body.appendChild(rightCharContainer);
    } else {
      rightCharContainer.innerHTML = ''; // Limpiar contenido previo
    }

    // Decidir qué lado mostrar
    const showLeft = Math.random() < 0.5;

    if (showLeft) {
      const selectedLeftImage = getRandomImage(leftCharacterImages);
      if (selectedLeftImage) {
        const charImg = document.createElement('img');
        charImg.src = selectedLeftImage;
        charImg.alt = "Personaje Izquierdo";
        charImg.style.width = '100%';
        charImg.style.height = '100%';
        charImg.style.objectFit = 'contain';
        leftCharContainer.appendChild(charImg);

        const randomEmoji = getRandomEmoji(unicodeEmojis);
        if (randomEmoji) {
          // *** NUEVO: Crear el contenedor de la imagen de la burbuja ***
          const bubbleContainer = document.createElement('div');
          bubbleContainer.classList.add('comic-bubble-image-container');
          
          // *** NUEVO: Crear la imagen de la burbuja ***
          const bubbleImg = document.createElement('img');
          bubbleImg.src = bubbleImage; // Usa la imagen importada
          bubbleImg.alt = "Burbuja de Comic";
          bubbleImg.classList.add('comic-bubble-image');
          // NO aplicamos 'flipped' aquí, ya que es el lado izquierdo

          const emojiSpan = document.createElement('span');
          emojiSpan.textContent = randomEmoji;
          emojiSpan.classList.add('bubble-emoji-text');
          
          bubbleContainer.appendChild(bubbleImg); // Añade la imagen al contenedor
          bubbleContainer.appendChild(emojiSpan); // Añade el emoji al contenedor
          leftCharContainer.appendChild(bubbleContainer); // Añade el contenedor al personaje
        }
      } else {
        console.warn("No hay imágenes definidas para el lado izquierdo.");
      }
      rightCharContainer.style.display = 'none';
    } else {
      const selectedRightImage = getRandomImage(rightCharacterImages);
      if (selectedRightImage) {
        const charImg = document.createElement('img');
        charImg.src = selectedRightImage;
        charImg.alt = "Personaje Derecho";
        charImg.style.width = '100%';
        charImg.style.height = '100%';
        charImg.style.objectFit = 'contain';
        rightCharContainer.appendChild(charImg);

        const randomEmoji = getRandomEmoji(unicodeEmojis);
        if (randomEmoji) {
          // *** NUEVO: Crear el contenedor de la imagen de la burbuja ***
          const bubbleContainer = document.createElement('div');
          bubbleContainer.classList.add('comic-bubble-image-container');
          
          // *** NUEVO: Crear la imagen de la burbuja ***
          const bubbleImg = document.createElement('img');
          bubbleImg.src = bubbleImage; // Usa la imagen importada
          bubbleImg.alt = "Burbuja de Comic";
          bubbleImg.classList.add('comic-bubble-image');
          bubbleImg.classList.add('flipped'); // *** APLICAR CLASE 'flipped' para el efecto espejo ***

          const emojiSpan = document.createElement('span');
          emojiSpan.textContent = randomEmoji;
          emojiSpan.classList.add('bubble-emoji-text');
          
          bubbleContainer.appendChild(bubbleImg); // Añade la imagen al contenedor
          bubbleContainer.appendChild(emojiSpan); // Añade el emoji al contenedor
          rightCharContainer.appendChild(bubbleContainer); // Añade el contenedor al personaje
        }
      } else {
        console.warn("No hay imágenes definidas para el lado derecho.");
      }
      leftCharContainer.style.display = 'none';
    }

    document.body.style.setProperty('--image-left-url', 'none');
    document.body.style.setProperty('--image-right-url', 'none');

    return () => {
      if (leftCharContainer) leftCharContainer.remove();
      if (rightCharContainer) rightCharContainer.remove();
    };

  }, []);

  return (
    <div className="App">
      <Chatbot />
    </div>
  );
}

export default App;