const express = require('express');
const app = express();
const api = require('./api');
const localPort = process.env.PORT || 5000

app.use(express.json());
app.listen(localPort, () => {
    console.log(`API translator (${localPort}) running...`);
});


app.get('/', api.getRoot);
app.get('/NodeStatus', api.getNodeStatus);

