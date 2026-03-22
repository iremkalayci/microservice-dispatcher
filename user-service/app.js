const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: "User service çalışıyor" });
});

module.exports = app;