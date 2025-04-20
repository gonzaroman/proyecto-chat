


// Extraer el ID de sala desde la URL
const url = new URL(window.location.href);
const partesRuta = url.pathname.split('/');
const idSala = partesRuta[2] || null;

console.log('🟢 Sala detectada:', idSala);

if (!idSala) {
  alert('⚠️ No se ha especificado una sala. Redirigiendo...');
  window.location.href = '/'; // O muestra un formulario para crearla
}

const socket = io();
socket.emit('unirse a sala', idSala);
const nombreUsuario = localStorage.getItem('usuario');
if (!nombreUsuario) {
  alert(' Debes iniciar sesión primero');
  window.location.href = '/registro.html'; // o /login.html si ya tienes login
}
let ultimoUsuario = null; //  Recordar quién envió el último mensaje

// Cargar info de la sala y mostrar botón si eres el creador
fetch(`/salas/${idSala}`)
  .then(res => res.json())
  .then(sala => {
    if (sala.creador === nombreUsuario) {
      document.getElementById('eliminar-sala').style.display = 'inline-block';

      document.getElementById('eliminar-sala').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar esta sala?')) {
          fetch(`/salas/${idSala}`, { method: 'DELETE' })
            .then(() => {
              alert('Sala eliminada');
              window.location.href = '/';
            });
        }
      });
    }
  });




document.getElementById('formulario-chat').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const entradaMensaje = document.getElementById('entrada-mensaje');
  const mensaje = entradaMensaje.value;
  if (mensaje.trim() !== '') {
    socket.emit('mensaje del chat', {
      usuario: nombreUsuario,
      texto: mensaje,
      sala: idSala
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
