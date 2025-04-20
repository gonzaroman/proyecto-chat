


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
const nombreUsuario = localStorage.getItem('usuario');


if (!nombreUsuario) {
  alert(' Debes iniciar sesión primero');
  window.location.href = '/registro.html'; // o /login.html si ya tienes login
}

socket.emit('usuario conectado', nombreUsuario);
socket.emit('unirse a sala', idSala);

let ultimoUsuario = null; //  Recordar quién envió el último mensaje

// Cargar info de la sala y mostrar botón si eres el creador
fetch(`/salas/${idSala}`)
  .then(res => res.json())
  .then(sala => {
    document.getElementById('nombre-sala').textContent = sala.nombre;

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

  socket.on('usuarios en sala', (usuarios) => {
    const lista = document.getElementById('usuarios-sala');
    lista.innerHTML = '';
  
    usuarios.forEach(usuario => {
      if (usuario === nombreUsuario) return; // No te muestres a ti mismo
  
      const li = document.createElement('li');
      const enlace = document.createElement('a');
  
      // Generar id del chat privado: ordenado alfabéticamente
      const idPrivado = [nombreUsuario, usuario].sort().join('-');
  
      enlace.href = `/privado/${idPrivado}`;
      enlace.textContent = usuario;
      enlace.style.cursor = 'pointer';
      enlace.style.textDecoration = 'underline';
      enlace.style.color = '#007bff';
  
      li.appendChild(enlace);
      lista.appendChild(li);
    });
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


// 🟢 Hacer scroll hacia abajo automáticamente
lista.scrollTop = lista.scrollHeight;



  ultimoUsuario = mensaje.usuario;
}
