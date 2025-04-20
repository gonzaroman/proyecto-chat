const socket = io();

// Obtener ID de chat desde la URL (ej: /privado/antonio-gonzalo)
const url = new URL(window.location.href);
const partesRuta = url.pathname.split('/');
const idPrivado = partesRuta[2];

// Obtener usuario actual
const nombreUsuario = localStorage.getItem('usuario');
if (!nombreUsuario) {
  alert('Debes iniciar sesión');
  window.location.href = '/login.html';
}

// Separar los dos participantes
const [usuarioA, usuarioB] = idPrivado.split('-');

// Determinar el otro usuario (no tú)
const destino = usuarioA === nombreUsuario ? usuarioB : usuarioA;

// Mostrar el nombre del otro en el título
document.getElementById('nombre-destino').textContent = destino;

// Unirse a la sala privada
socket.emit('usuario conectado', nombreUsuario);

socket.emit('unirse a sala privada', idPrivado);

// Escuchar mensajes
socket.on('mensaje privado', (mensaje) => {
    const autor = mensaje.de === nombreUsuario ? 'Tú' : mensaje.de;
    mostrarMensaje(autor, mensaje.texto, ultimoUsuario);
    ultimoUsuario = autor;
  });

socket.on('mensajes anteriores privados', (mensajes) => {
    let ultimoUsuarioAnterior = null;
  
    mensajes.forEach(m => {
      const autor = m.usuario === nombreUsuario ? 'Tú' : m.usuario;
      mostrarMensaje(autor, m.texto, ultimoUsuarioAnterior);
      ultimoUsuarioAnterior = autor;
    });
  });

// Enviar mensajes
document.getElementById('formulario').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('entrada');
  const texto = input.value.trim();
  if (texto) {
    socket.emit('mensaje privado', {
      sala: idPrivado,
      de: nombreUsuario,
      para: destino,
      texto
    });
   // mostrarMensaje('Tú', texto);
    input.value = '';
  }
});

function mostrarMensaje(usuario, texto, ultimo = null) {
    const lista = document.getElementById('mensajes');
    const li = document.createElement('li');
  
    if (usuario === nombreUsuario || usuario === 'Tú') {
      li.classList.add('mensaje-propio');
    } else {
      li.classList.add('mensaje-otro');
    }
  
    // Solo mostrar el nombre si es distinto al anterior
    if (usuario !== ultimo) {
      const nombreElem = document.createElement('strong');
      nombreElem.textContent = `${usuario}:\n`;
      li.appendChild(nombreElem);
    }
  
    const textoNodo = document.createTextNode(` ${texto}`);
    li.appendChild(textoNodo);
  
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const horaElem = document.createElement('div');
    horaElem.style.fontSize = '0.8em';
    horaElem.style.color = '#888';
    horaElem.style.marginTop = '2px';
    horaElem.textContent = hora;
    li.appendChild(horaElem);
  
    lista.appendChild(li);
    lista.scrollTop = lista.scrollHeight;
  
    // Actualizar último autor en memoria para siguientes mensajes nuevos en vivo
    ultimoUsuario = usuario;
  }
  
  
