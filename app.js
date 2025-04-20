const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

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

app.get('/sala/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/crear-sala.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crear-sala.html'));
});


server.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});

io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado');

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


  socket.on('disconnect', () => {
    console.log('Un usuario se ha desconectado');
  });
});

