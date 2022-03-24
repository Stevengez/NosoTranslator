const Net = require('net');

const port = 8080;
const host = '192.210.226.118';



const client = new Net.Socket();

client.connect({port: port, host: host}, function() {
    console.log("TCP connection established");
    client.write("NODESTATUS\n");
});

client.on("data", function(chunk){
    console.log("Data its been retrieved from host: ",chunk.toString());
    client.end;
});