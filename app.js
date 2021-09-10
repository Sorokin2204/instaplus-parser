const express = require('express');
const config = require('config');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const responseTime = require('response-time');
const app = express();

const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    rejectUnauthorized: false,
  },
});

//app.use(responseTime({digits: '200.000ms'}));
//  app.use(timeout('100s'));
app.use(express.json({ extended: true }));
// app.use('/api/auth', require('./routes/auth.routes'));
 app.use('/api/exports', require('./routes/exports.routes'));
 app.use('/api/category', require('./routes/category.routes'));
// app.use('/t', require('./routes/redirect.routes'));

// if (process.env.NODE_ENV === 'production') {
//   app.use('/', express.static(path.join(__dirname, 'client', 'build')));

//   app.get('*', (req, res) => {
//     res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
//   });
// }




const PORT = config.get('port') || 5000;

async function start() {
  try {
    await mongoose.connect(config.get('mongoUri'), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    http.listen(PORT, () => {
      console.log(`App has been started on port ${PORT}...`);
      io.on('connection', (socket) => {
        socket.join('exportRoom');
      });
       app.set('socketio', io);

    });
    


  } catch (e) {
    console.log('Server Error', e.message);
    process.exit(1);
  }
}


async function  imitateSend (socket) { 
  for (let index = 0; index < 10; index++) {
    setTimeout(() => {
        socket.emit('connection', index);
    }, 2000);
  }
}

start();
