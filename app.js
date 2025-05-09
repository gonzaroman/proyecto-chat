const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.json());


//conexion a mongoDB
const mongoose = require('mongoose');

// Conexión a MongoDB local
mongoose.connect('mongodb://localhost:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB local'))
.catch((error) => console.error('❌ Error al conectar con MongoDB:', error));



//conexion a mongoDB
const EsquemaMensaje = new mongoose.Schema({
  usuario: String,
  texto: String,
  sala: String,
  fecha: { type: Date, default: Date.now }
});

const Mensaje = mongoose.model('Mensaje', EsquemaMensaje);




app.use(express.static('public'));



const path = require('path');


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/salas', async (req, res) => {
  const salas = await Sala.find().sort({ fechaCreacion: -1 });
  res.json(salas);
});


app.post('/salas', async (req, res) => {
  const { nombre, creador } = req.body;
  const id = nombre.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 5);
  const nuevaSala = new Sala({ id, nombre, creador });
  await nuevaSala.save();
  res.json({ id });
});


const Usuario = require('./models/Usuario'); //modelo usuario
const Sala = require('./models/Sala');

app.post('/registro', async (req, res) => {
  const { nombre, contraseña } = req.body;

  if (!nombre || !contraseña) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const existe = await Usuario.findOne({ nombre });
  if (existe) {
    return res.status(400).json({ error: 'El usuario ya existe' });
  }

  const nuevo = new Usuario({ nombre, contraseña });
  await nuevo.save();

  res.status(201).json({ mensaje: 'Usuario creado' });
});

app.post('/login', async (req, res) => {
  const { nombre, contraseña } = req.body;

  const usuario = await Usuario.findOne({ nombre });

  if (!usuario || usuario.contraseña !== contraseña) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  res.json({ mensaje: 'Inicio de sesión correcto' });
});

app.get('/salas/:id', async (req, res) => {
  const sala = await Sala.findOne({ id: req.params.id });
  if (!sala) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json(sala);
});

app.delete('/salas/:id', async (req, res) => {
  const sala = await Sala.findOneAndDelete({ id: req.params.id });
  if (!sala) return res.status(404).json({ error: 'Sala no encontrada' });

  await Mensaje.deleteMany({ sala: req.params.id }); // Elimina todos los mensajes de esa sala

  res.status(200).json({ mensaje: 'Sala eliminada correctamente' });
});



app.get('/sala/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/crear-sala.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crear-sala.html'));
});

app.get('/privado/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat-privado.html'));
});



server.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});

let usuariosConectados = [];
let usuariosPorSala = {};

const socketUsuarios = {};

io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado');

  

  

  socket.on('usuario conectado', (nombre) => {
    socket.nombre = nombre; // para identificar al desconectar
    socketUsuarios[nombre] = socket; // ✅ guardar el socket
    if (!usuariosConectados.includes(nombre)) {
      usuariosConectados.push(nombre);
    }
    io.emit('lista usuarios', usuariosConectados);
  });

  // Unirse a sala privada
socket.on('unirse a sala privada', async (idPrivado) => {
  socket.join(idPrivado);

  // Enviar mensajes anteriores (últimos 100)
  const mensajes = await Mensaje.find({ sala: idPrivado }).sort({ fecha: 1 }).limit(100);
  socket.emit('mensajes anteriores privados', mensajes);
});

// Enviar mensaje privado
socket.on('mensaje privado', async ({ sala, de, para, texto }) => {
  const mensaje = new Mensaje({
    usuario: de,
    texto,
    sala, // <- el ID del chat privado, ej. pepe-tt
    fecha: new Date()
  });

  await mensaje.save(); // ✅ Guarda en MongoDB

  io.to(sala).emit('mensaje privado', { de, texto });
});
  



  
  socket.on('disconnect', () => {
    usuariosConectados = usuariosConectados.filter(u => u !== socket.nombre);
    io.emit('lista usuarios', usuariosConectados);

    // Eliminar usuario de su sala (si estaba)
    if (socket.salaId && usuariosPorSala[socket.salaId]) {
      usuariosPorSala[socket.salaId] = usuariosPorSala[socket.salaId].filter(u => u !== socket.nombre);
      io.to(socket.salaId).emit('usuarios en sala', usuariosPorSala[socket.salaId]);
    }
  });


  socket.on('unirse a sala', (idSala) => {
    socket.join(idSala);
    console.log(`Usuario unido a sala ${idSala}`);

    socket.salaId = idSala; // Guardar la sala actual en el socket

  // Añadir al usuario en la sala
  if (!usuariosPorSala[idSala]) {
    usuariosPorSala[idSala] = [];
  }

  if (!usuariosPorSala[idSala].includes(socket.nombre)) {
    usuariosPorSala[idSala].push(socket.nombre);
  }

  io.to(idSala).emit('usuarios en sala', usuariosPorSala[idSala]);


// Enviar mensajes anteriores al conectarse
Mensaje.find({ sala: idSala }).sort({ fecha: 1 }).limit(100)
.then((mensajes) => {
  socket.emit('mensajes anteriores', mensajes);
});
});


 /* socket.on('mensaje del chat', (message) => {
    console.log('Nuevo mensaje:', message);
    io.emit('mensaje del chat', message);
  });*/


  socket.on('mensaje del chat', (mensaje) => {
    const nuevoMensaje = new Mensaje(mensaje);
    console.log('Nuevo mensaje:', mensaje);
    nuevoMensaje.save()
      .then(() => {
       // io.emit('mensaje del chat', mensaje);
       io.to(mensaje.sala).emit('mensaje del chat', mensaje); // Solo a esa sala
      })
      .catch((error) => {
        console.error('❌ Error al guardar el mensaje:', error);
      });
  });


 
});

