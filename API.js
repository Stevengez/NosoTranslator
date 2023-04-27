const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const bodyParser = require('body-parser')
const routes = require('./routes')();
const securePort = process.env.PORT || 8080;
const { verifyToken, verifyOrigin, originsArray } = require('./middleware/authorization');
const { SyncCycle } = require('./service/NosoProtocol');

const corsOptions = {
    origin: originsArray,
    methods: ['POST']
}

app.use(bodyParser.json());
app.use(cors(corsOptions));
//app.use(verifyOrigin);
app.use(verifyToken);
app.use(express.json());
app.use('/', routes);

//Run Initial Sync Cycle
SyncCycle();
/*app.listen(localPort, () => {
    console.log(`API translator (${localPort}) running...`);
});*/

https.createServer({
    key: fs.readFileSync('SSL_CERT/7software.key'),
    cert: fs.readFileSync('SSL_CERT/7software.cert')
}, app).listen(securePort, () => {
    console.log(`API translator (${securePort}) running...`);
});

