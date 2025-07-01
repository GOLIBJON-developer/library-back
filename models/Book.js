const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  genre: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, enum: ['pdf', 'mp3', 'mp4'], required: true },
  coverUrl: { type: String },
  year: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema); 