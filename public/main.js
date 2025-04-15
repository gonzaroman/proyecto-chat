const socket = io();

const nombreUsuario = prompt('¿Cuál es tu nombre?');



document.getElementById('formulario-chat').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const entradaMensaje = document.getElementById('entrada-mensaje');
  const mensaje = entradaMensaje.value;
  if (mensaje.trim() !== '') {
    socket.emit('mensaje del chat', {
      usuario: nombreUsuario,
      texto: mensaje
    });
    entradaMensaje.value = '';
  }
});

socket.on('mensaje del chat', (mensaje) => {
  const listaMensajes = document.getElementById('mensajes');
  const elemento = document.createElement('li');

  if (mensaje.usuario === nombreUsuario) {
    elemento.classList.add('mensaje-propio');
  } else {
    elemento.classList.add('mensaje-otro');
  }

  elemento.textContent = `${mensaje.usuario}: ${mensaje.texto}`;
  listaMensajes.appendChild(elemento);
});
