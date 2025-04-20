const usuario = localStorage.getItem('usuario');
if (!usuario) {
  alert('⚠️ Debes registrarte primero');
  window.location.href = '/registro.html';
}

// Mostrar saludo
document.getElementById('saludo').textContent = `Hola, ${usuario}!`;

// Cargar salas desde el servidor
fetch('/salas')
  .then(res => res.json())
  .then(salas => {
    const contenedor = document.getElementById('salas');
    salas.forEach(sala => {
      const div = document.createElement('div');
      div.classList.add('sala');
      div.innerHTML = `<a href="/sala/${sala.id}">${sala.nombre}</a>`;
      contenedor.appendChild(div);
    });
  });

// Crear nueva sala
function crearSala() {
  const nombre = document.getElementById('nombreSala').value.trim();
  if (!nombre) return alert('Escribe un nombre');

  fetch('/salas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, creador: usuario })
  })
  .then(res => res.json())
  .then(data => {
    window.location.href = `/sala/${data.id}`;
  });
}

// Mostrar usuarios activos
const socket = io();
socket.emit('usuario conectado', usuario);

socket.on('lista usuarios', (usuarios) => {
  const lista = document.getElementById('lista-usuarios');
  lista.innerHTML = '';
  usuarios.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    lista.appendChild(li);
  });
});
