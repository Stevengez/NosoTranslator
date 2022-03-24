const Net = require('net');
const NodePort = 8080;
const NodeHost = '192.210.226.118';

const getRoot = async (request, response) => {
    response.status(200).send("ok");
}

const getNodeStatus = async(request, response) => {
    const {host, port} = request.query;
    
    const client = new Net.Socket();
    client.connect({port: port, host: host}, function() {
        client.write("NODESTATUS\n");
    });

    client.on("data", function(chunk){
        const res = chunk.toString();
        client.end;
        return response.status(200).send(res);
    });
}

module.exports = {
    getRoot,
    getNodeStatus
}