const mongoose = require('mongoose');

const EsquemaUsuario = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true }
});

module.exports = mongoose.model('Usuario', EsquemaUsuario);
