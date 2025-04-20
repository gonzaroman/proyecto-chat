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

socket.on('mensajes anteriores', (mensajes) => {
  mensajes.forEach((mensaje) => {
    mostrarMensaje(mensaje);
  });
});

socket.on('mensaje del chat', mostrarMensaje);

function mostrarMensaje(mensaje) {
  const listaMensajes = document.getElementById('mensajes');
  const elemento = document.createElement('li');

  if (mensaje.usuario === nombreUsuario) {
    elemento.classList.add('mensaje-propio');
  } else {
    elemento.classList.add('mensaje-otro');
  }

  if (mensaje.usuario !== ultimoUsuario) {
    const nombreElemento = document.createElement('strong');
    nombreElemento.textContent = `${mensaje.usuario}:\n`;
    elemento.appendChild(nombreElemento);
  }

  const textoNodo = document.createTextNode(` ${mensaje.texto}`);
  elemento.appendChild(textoNodo);
  listaMensajes.appendChild(elemento);


//  Mostrar la hora del mensaje
const fechaMensaje = new Date(mensaje.fecha || Date.now()); // Usa la fecha si existe o la actual
const hora = fechaMensaje.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const horaElemento = document.createElement('div');
horaElemento.style.fontSize = '0.8em';
horaElemento.style.color = '#888';
horaElemento.style.marginTop = '2px';
horaElemento.textContent = hora;

elemento.appendChild(horaElemento);
listaMensajes.appendChild(elemento);

//hasta aqui hora del mensaje




  ultimoUsuario = mensaje.usuario;
}
