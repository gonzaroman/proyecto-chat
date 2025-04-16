const socket = io();
const nombreUsuario = prompt('¿Cuál es tu nombre?');
let ultimoUsuario = null; //  Recordar quién envió el último mensaje

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

  //  Solo mostrar el nombre si es distinto al anterior
  if (mensaje.usuario !== ultimoUsuario) {
    const nombreElemento = document.createElement('strong');
    nombreElemento.textContent = `${mensaje.usuario}:\n`;
    elemento.appendChild(nombreElemento);
  }

  // Texto del mensaje
  const textoNodo = document.createTextNode(` ${mensaje.texto}`);
  elemento.appendChild(textoNodo);

  listaMensajes.appendChild(elemento);

  // Guardar el último usuario que escribió
  ultimoUsuario = mensaje.usuario;
});
