const Net = require('net');
const NodePort = 8080;
const NodeHost = '192.210.226.118';

const getRoot = async (request, response) => {
    response.status(200).send("ok");
}

const getNodeStatus = async(request, response) => {

    console.log("Request for NodeStatus started...")
    const client = new Net.Socket();

    client.connect({port: NodePort, NodeHost: NodeHost}, function() {
        console.log("TCP connection established");
        client.write("NODESTATUS\n");
    });

    client.on("data", function(chunk){
        response.status(200).send(chunk.toString());
        client.end;
    });
}




module.exports = {
    getRoot,
    getNodeStatus
}