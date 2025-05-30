
// 1) Dependencias y modelos
const express = require('express');      // Framework para construir servidores HTTP
const cors = require('cors');            // Middleware para permitir peticiones desde otros orígenes
const http = require('http');            // Módulo para crear el servidor HTTP
const path = require('path');            // Módulo para trabajar con rutas de archivos
const mongoose = require('mongoose');    // ODM para trabajar con MongoDB desde Node.js

// Modelos de la base de datos
const Usuario = require('./models/Usuario');
const Sala = require('./models/Sala');

// Lista para controlar usuarios conectados
let usuariosConectados = [];

// Esquema del modelo de datos para los mensajes del chat
const EsquemaMensaje = new mongoose.Schema({
  usuario: String,
  texto: {
    type: String,
   // required: true,
  //  maxlength: 500 // Limita a 500 caracteres
  },
  sala: String,
  fecha: { type: Date, default: Date.now }
});
const Mensaje = mongoose.model('Mensaje', EsquemaMensaje);

// 2) Configuración de Express y CORS
const app = express();                         // Instancia de la aplicación
const server = http.createServer(app);         // Crear el servidor HTTP
const io = require('socket.io')(server, {      // Crear servidor WebSocket
  cors: {
    origin: 'http://localhost:4200',           // Permitir solo conexiones desde el frontend local
    methods: ['GET', 'POST']
  }
});

// Middleware para permitir CORS y parsear JSON
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());
app.use(express.static('public')); // Servir archivos estáticos

// 3) Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB local'))
.catch(err => console.error('❌ Error al conectar con MongoDB:', err));

// ---- RUTAS API ----

// Obtener todos los usuarios registrados y si están conectados
app.get('/usuarios', async (req, res) => {
  try {
    const todos = await Usuario.find({}, { nombre: 1, _id: 0 });
    const lista = todos.map(u => ({
      nombre: u.nombre,
      online: usuariosConectados.includes(u.nombre)
    }));
    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// Obtener las salas creadas por un usuario concreto
app.get('/salas/propias', async (req, res) => {
  const creador = req.query.creador;
  if (!creador) return res.status(400).json({ error: 'Falta parámetro creador' });
  try {
    const propias = await Sala.find({ creador });
    res.json(propias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener las conversaciones privadas de un usuario
app.get('/privados/:usuario', async (req, res) => {
  try {
    const user = req.params.usuario;
    const salas = await Mensaje.distinct('sala', {
      sala: { $regex: new RegExp(`(^|-)${user}(-|$)`) }
    });
    const conv = salas.map(id => {
      const otro = id.split('-').find(u => u !== user) || '';
      return { id, con: otro };
    });
    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener privados' });
  }
});

/* PARA EL ADMINISTRADOR */
app.get('/admin/usuarios', async (req, res) => {
  const usuarios = await Usuario.find({}, { nombre: 1 });
  res.json(usuarios);
});

app.delete('/admin/usuarios/:nombre', async (req, res) => {
  const eliminado = await Usuario.findOneAndDelete({ nombre: req.params.nombre });
  if (!eliminado) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ mensaje: 'Usuario eliminado' });
});

app.get('/admin/salas', async (req, res) => {
  const salas = await Sala.find();
  res.json(salas);
});

app.delete('/admin/salas/:id', async (req, res) => {
  const sala = await Sala.findOneAndDelete({ id: req.params.id });
  if (!sala) return res.status(404).json({ error: 'Sala no encontrada' });
  await Mensaje.deleteMany({ sala: req.params.id }); // borra mensajes
  res.json({ mensaje: 'Sala eliminada correctamente' });
});

/*FIN PARA EL ADMINISTRADOR */


// CRUD de Salas
app.get('/salas', async (req, res) => {
  const salas = await Sala.find().sort({ fechaCreacion: -1 });
  res.json(salas);
});

// Crear una nueva sala
app.post('/salas', async (req, res) => {
  const { nombre, creador } = req.body;
  const id = nombre.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 5);
  const nueva = new Sala({ id, nombre, creador });
  await nueva.save();
  res.json({ id });
});

// Obtener una sala por su ID
app.get('/salas/:id', async (req, res) => {
  const sala = await Sala.findOne({ id: req.params.id });
  if (!sala) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json(sala);
});

// Eliminar una sala por ID
app.delete('/salas/:id', async (req, res) => {
  const sala = await Sala.findOneAndDelete({ id: req.params.id });
  if (!sala) return res.status(404).json({ error: 'Sala no encontrada' });
  await Mensaje.deleteMany({ sala: req.params.id });
  res.json({ mensaje: 'Sala eliminada correctamente' });
});

// Registro de nuevos usuarios
app.post('/registro', async (req, res) => {
  const { nombre, contraseña } = req.body;
  if (!nombre || !contraseña) return res.status(400).json({ error: 'Faltan datos' });
  if (await Usuario.findOne({ nombre })) return res.status(400).json({ error: 'El usuario ya existe' });
  await new Usuario({ nombre, contraseña }).save();
  res.status(201).json({ mensaje: 'Usuario creado' });
});

// Login de usuario
app.post('/login', async (req, res) => {
  const { nombre, contraseña } = req.body;
  const user = await Usuario.findOne({ nombre });
  if (!user || user.contraseña !== contraseña) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  res.json({ mensaje: 'Inicio de sesión correcto' });
});

// 5) WebSockets
let usuariosPorSala = {};
io.on('connection', socket => {

  // Cuando un usuario se conecta
  socket.on('usuario conectado', nombre => {
    socket.nombre = nombre;
    if (!usuariosConectados.includes(nombre)) {
      usuariosConectados.push(nombre);
      io.emit('lista usuarios', usuariosConectados); // Actualiza la lista a todos
    }
  });

  // Unirse a una sala pública
  socket.on('unirse a sala', idSala => {
    socket.join(idSala);
    socket.salaId = idSala;
    usuariosPorSala[idSala] ??= [];
    if (!usuariosPorSala[idSala].includes(socket.nombre)) {
      usuariosPorSala[idSala].push(socket.nombre);
    }
    io.to(idSala).emit('usuarios en sala', usuariosPorSala[idSala]);

    // Enviar historial de mensajes
    Mensaje.find({ sala: idSala }).sort({ fecha: 1 }).limit(100)
      .then(ms => socket.emit('mensajes anteriores', ms));
  });

  // Enviar mensaje público
  socket.on('mensaje del chat', m => {
     if (!m.texto || m.texto.length > 500) return; // Ignorar mensajes vacíos o largos
    new Mensaje(m).save().then(() => {
      io.to(m.sala).emit('mensaje del chat', m);
    });
  });

  // Unirse a una sala privada
  socket.on('unirse a sala privada', async salaPriv => {
    socket.join(salaPriv);
    const ms = await Mensaje.find({ sala: salaPriv }).sort({ fecha: 1 }).limit(100);
    socket.emit('mensajes anteriores privados', ms);
  });

  // Enviar mensaje privado

  socket.on('mensaje privado', async data => {
  if (!data.texto || data.texto.length > 500) return; //ignorar mensajes vacios o largos
    

  await new Mensaje({
    usuario: data.de,
    texto: data.texto,
    sala: data.sala,
    fecha: new Date()
  }).save();

  io.to(data.sala).emit('mensaje privado', { de: data.de, texto: data.texto });
});

  // Al desconectarse el usuario
  socket.on('disconnect', () => {
    usuariosConectados = usuariosConectados.filter(u => u !== socket.nombre);
    io.emit('lista usuarios', usuariosConectados);
  });
});

// 6) Levantar servidor en puerto 3000
server.listen(3000, () => {
  console.log('✅ Servidor corriendo en puerto 3000');
});
