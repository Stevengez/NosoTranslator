const express = require('express');
const app = express();
const api = require('./api');

const localPort = 80;
const NodePort = 8080;
const NodeHost = '192.210.226.118';

app.use(express.json());
app.listen(localPort, () => {
    console.log("API translator running...");
});


app.get('/', api.getRoot);
app.get('/NodeStatus', api.getNodeStatus);

