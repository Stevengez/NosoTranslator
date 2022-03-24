const Net = require('net');
const NodePort = 8080;
const NodeHost = '192.210.226.118';
const client = new Net.Socket();

const getRoot = async (request, response) => {
    response.status(200).send("ok");
}

const getNodeStatus = async(request, response) => {

    console.log("Request for NodeStatus started...");
    client.connect({port: NodePort, host: NodeHost}, function() {
        console.log("TCP connection established");
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