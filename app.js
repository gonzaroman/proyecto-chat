const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

server.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});

io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado');

  socket.on('mensaje del chat', (message) => {
    console.log('Nuevo mensaje:', message);
    io.emit('mensaje del chat', message);
  });

  socket.on('disconnect', () => {
    console.log('Un usuario se ha desconectado');
  });
});

