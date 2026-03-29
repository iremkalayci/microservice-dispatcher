require('dotenv').config();
const app = require('./app');

const port = process.env.PORT || 3002;

app.listen(port, () => {
  console.log(`Product service ${port} portunda çalışıyor`);
});