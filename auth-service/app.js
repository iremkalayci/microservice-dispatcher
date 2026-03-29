require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// MongoDB Bağlantısı (NoSQL İsteri)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Auth DB Bağlandı"))
  .catch(err => console.error("DB Hatası:", err));

// Basit bir Login Endpoint (Burada normalde DB kontrolü olur)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Şimdilik test için herkesi içeri alalım ama Token verelim
  if (username === "irem" && password === "123456") {
    const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }
  
  res.status(401).json({ error: "Kullanıcı adı veya şifre yanlış" });
});

const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`Auth Service ${port} portunda!`));