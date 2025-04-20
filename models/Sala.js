const mongoose = require('mongoose');

const EsquemaSala = new mongoose.Schema({
  id: String,
  nombre: String,
  creador: String,
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sala', EsquemaSala);
