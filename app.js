// app.js

// 1) Dependencias y modelos
const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const path      = require('path');
const mongoose  = require('mongoose');

// Modelos
const Usuario = require('./models/Usuario');
const Sala    = require('./models/Sala');

let usuariosConectados = [];


// Esquema de mensaje
const EsquemaMensaje = new mongoose.Schema({
  usuario: String,
  texto:   String,
  sala:    String,
  fecha:   { type: Date, default: Date.now }
});
const Mensaje = mongoose.model('Mensaje', EsquemaMensaje);

// 2) Configuración de Express y CORS
const app    = express();
const server = http.createServer(app);
const io     = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET','POST']
  }
});

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());
app.use(express.static('public'));

// 3) Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Conectado a MongoDB local'))
  .catch(err => console.error('❌ Error al conectar con MongoDB:', err));

// ---- RUTAS API ----

// Listar todos los usuarios y su estado online

app.get('/usuarios', async (req, res) => {
  try {
    const todos = await Usuario.find({}, { nombre:1, _id:0 });
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

// Listar salas propias
app.get('/salas/propias', async (req, res) => {
  const creador = req.query.creador;
  if (!creador) return res.status(400).json({ error:'Falta parámetro creador' });
  try {
    const propias = await Sala.find({ creador });
    res.json(propias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:'Error interno' });
  }
});

// Listar conversaciones privadas de un usuario
app.get('/privados/:usuario', async (req, res) => {
  try {
    const user = req.params.usuario;
    const salas = await Mensaje.distinct('sala', {
      sala: { $regex: new RegExp(`(^|-)${user}(-|$)`) }
    });
    const conv = salas.map(id => {
      const otro = id.split('-').find(u => u!==user) || '';
      return { id, con: otro };
    });
    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:'Error al obtener privados' });
  }
});



// CRUD Salas
app.get('/salas', async (req, res) => {
  const salas = await Sala.find().sort({ fechaCreacion:-1 });
  res.json(salas);
});
app.post('/salas', async (req, res) => {
  const { nombre, creador } = req.body;
  const id = nombre.toLowerCase().replace(/\s+/g,'-') + '-' + Math.random().toString(36).substring(2,5);
  const nueva = new Sala({ id, nombre, creador });
  await nueva.save();
  res.json({ id });
});
app.get('/salas/:id', async (req, res) => {
  const sala = await Sala.findOne({ id:req.params.id });
  if (!sala) return res.status(404).json({ error:'Sala no encontrada' });
  res.json(sala);
});
app.delete('/salas/:id', async (req, res) => {
  const sala = await Sala.findOneAndDelete({ id:req.params.id });
  if (!sala) return res.status(404).json({ error:'Sala no encontrada' });
  await Mensaje.deleteMany({ sala:req.params.id });
  res.json({ mensaje:'Sala eliminada correctamente' });
});

// Registro / Login
app.post('/registro', async (req, res) => {
  const { nombre, contraseña } = req.body;
  if (!nombre||!contraseña) return res.status(400).json({ error:'Faltan datos' });
  if (await Usuario.findOne({ nombre })) return res.status(400).json({ error:'El usuario ya existe' });
  await new Usuario({ nombre, contraseña }).save();
  res.status(201).json({ mensaje:'Usuario creado' });
});
app.post('/login', async (req, res) => {
  const { nombre, contraseña } = req.body;
  const user = await Usuario.findOne({ nombre });
  if (!user||user.contraseña!==contraseña) return res.status(401).json({ error:'Usuario o contraseña incorrectos' });
  res.json({ mensaje:'Inicio de sesión correcto' });
});




// 4) Rutas estáticas (cliente)
/*app.get('/',               (req,res) => res.sendFile(path.join(__dirname,'public','home.html')));
app.get('/sala/:id',       (req,res) => res.sendFile(path.join(__dirname,'public','chat.html')));
app.get('/crear-sala.html',(req,res) => res.sendFile(path.join(__dirname,'public','crear-sala.html')));
app.get('/privado/:id',    (req,res) => res.sendFile(path.join(__dirname,'public','chat-privado.html')));*/





// 5) WebSockets
let usuariosPorSala = {};
io.on('connection', socket => {
  console.log('🔌 Nuevo socket conectado');

  socket.on('usuario conectado', nombre => {
    socket.nombre = nombre;
    if (!usuariosConectados.includes(nombre)) usuariosConectados.push(nombre);
    io.emit('lista usuarios', usuariosConectados);
  });

  socket.on('unirse a sala', idSala => {
    socket.join(idSala);
    socket.salaId = idSala;
    usuariosPorSala[idSala] ??= [];
    if (!usuariosPorSala[idSala].includes(socket.nombre)) {
      usuariosPorSala[idSala].push(socket.nombre);
    }
    io.to(idSala).emit('usuarios en sala', usuariosPorSala[idSala]);
    Mensaje.find({ sala:idSala }).sort({ fecha:1 }).limit(100)
      .then(ms => socket.emit('mensajes anteriores', ms));
  });

  socket.on('mensaje del chat', m => {
    new Mensaje(m).save().then(() => {
      io.to(m.sala).emit('mensaje del chat', m);
    });
  });

  socket.on('unirse a sala privada', async salaPriv => {
    socket.join(salaPriv);
    const ms = await Mensaje.find({ sala:salaPriv }).sort({ fecha:1 }).limit(100);
    socket.emit('mensajes anteriores privados', ms);
  });
  socket.on('mensaje privado', async data => {
    await new Mensaje({ usuario:data.de, texto:data.texto, sala:data.sala, fecha:new Date() }).save();
    io.to(data.sala).emit('mensaje privado', { de:data.de, texto:data.texto });
  });

  socket.on('disconnect', () => {
    console.log('Desconectando usuario:', socket.nombre);
    usuariosConectados = usuariosConectados.filter(u=>u!==socket.nombre);
    io.emit('lista usuarios', usuariosConectados);
    if (socket.salaId && usuariosPorSala[socket.salaId]) {
      usuariosPorSala[socket.salaId] = usuariosPorSala[socket.salaId].filter(u=>u!==socket.nombre);
      io.to(socket.salaId).emit('usuarios en sala', usuariosPorSala[socket.salaId]);
    }
  });
});



// 6) Levantar servidor
server.listen(3000, () => {
  console.log('🚀 Servidor corriendo en puerto 3000');
});
