import express from 'express';
import {createServer} from "node:http";

const app = express();

const server = createServer(app);

server.listen(3000, () => {
    console.log(`Service listening on port 3000`)
});
