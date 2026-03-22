const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: "Product service çalışıyor" });
});

module.exports = app;