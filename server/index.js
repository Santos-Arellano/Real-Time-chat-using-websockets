import express from 'express';
import logger from 'morgan';
import { createServer } from 'http'; // Import createServer from http module
import { Server } from 'socket.io';

const port = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app); // Create an HTTP server
const io = new Server(httpServer); // Pass the HTTP server to socket.io

io.on('connection', (socket) => {
    console.log('A user has connected!')

    // Listen for disconnect event inside the connection event handler
    socket.on('disconnect', () => {
        console.log('A user has disconnected!')
    })
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg)
        })
})


app.use(logger('dev'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
});

httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
