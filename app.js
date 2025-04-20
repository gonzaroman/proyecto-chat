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




app.get('/sala/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/crear-sala.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crear-sala.html'));
});


server.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});

let usuariosConectados = [];
io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado');

  

  socket.on('usuario conectado', (nombre) => {
    socket.nombre = nombre; // para identificar al desconectar
    if (!usuariosConectados.includes(nombre)) {
      usuariosConectados.push(nombre);
    }
    io.emit('lista usuarios', usuariosConectados);
  });



  
  socket.on('disconnect', () => {
    usuariosConectados = usuariosConectados.filter(u => u !== socket.nombre);
    io.emit('lista usuarios', usuariosConectados);
  });


  socket.on('unirse a sala', (idSala) => {
    socket.join(idSala);
    console.log(`Usuario unido a sala ${idSala}`);


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

