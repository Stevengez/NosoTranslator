const express = require('express');
const cors = require('cors');
const app = express();
const api = require('./api');
const localPort = process.env.PORT || 5000

app.use(cors());
app.use(express.json());
app.listen(localPort, () => {
    console.log(`API translator (${localPort}) running...`);
});


app.get('/', api.getRoot);
app.get('/Consensus', api.getLastConsensus);
app.get('/Summary', api.getSummary);

api.SyncNodes();
setInterval(api.SyncNodes, 10000);

