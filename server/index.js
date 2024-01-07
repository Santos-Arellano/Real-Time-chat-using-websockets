import express from 'express';
import logger from 'morgan';
import { config } from 'dotenv';
import { createClient } from '@libsql/client';
import { Server } from 'socket.io';
import { createServer } from 'http';

config();

const port = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { connectionStateRecovery: {} });

const db = createClient({
    url: 'libsql://unique-bounty-santos-arellano.turso.io',
    authToken: process.env.DB_TOKEN
});

async function createMessagesTable() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            user TEXT
        )
    `);
}

io.on('connection', async (socket) => {
    console.log('A user has connected!');

    // Listen for disconnect event inside the connection event handler
    socket.on('disconnect', () => {
        console.log('A user has disconnected!');
    });

    socket.on('chat message', async (msg) => {
        let result;
        let username = socket.handshake.auth.username ?? 'anonymous';
        console.log({ username })
        try {
            result = await db.execute({
                sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
                args: { msg, username },
            });
        } catch (e) {
            console.error(e);
            return;
        }

        io.emit('chat message', msg, result.lastInsertRowid.toString(), username);
    });

    if (!socket.recovered) {
        try {
            const results = await db.execute({
                sql: 'SELECT id, content, user FROM messages WHERE id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            });

            results.rows.forEach(row => {
                socket.emit('chat message', row.content, row.id.toString(), row.user);
            });
        } catch (e) {
            console.error(e);
        }
    }
});

app.use(logger('dev'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
});

createMessagesTable().then(() => {
    httpServer.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});
