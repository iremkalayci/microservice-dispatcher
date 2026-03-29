require('dotenv').config(); // Gizli kasayı açan anahtar en üste!
const app = require('./app');

const port = process.env.PORT || 3000; 

app.listen(port, () => {
  console.log(`Dispatcher ${port} portunda çalışıyor`);
});