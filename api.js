const JsZip = require('jszip');
const Net = require('net');
const ConcensusData = require('./ConcensusData');
const NodeInfo = require('./NodeInfo');
const Zip = new JsZip();

var LastBlock = 0;
var LastBranch = "";
var LastPendingCount = 0;

var LastSummary = Buffer.from([]);
var LastPendings = "";

var pendingNodes = 0;
var nodeResults = [];

const seedNodes = [
    "192.210.226.118",
    "45.146.252.103",
    "194.156.88.117",
    "107.172.5.8",
    "185.239.239.184",
    "109.230.238.240",
    "23.94.21.83"
];

const getRoot = async (request, response) => {
    response.status(200).send("ok");
}

const SyncNodes = async() => {
    pendingNodes = seedNodes.length;
    nodeResults = [];
    seedNodes.forEach((node) => {
        getTCPNodeStatus(node);
    });
}

function Consensus (){
    let arrT = [];
    let CTime = 0;
    let CBlock = 0;
    let CBranch = 0;
    let CPending = 0;

    // Concensus of unix time
    for(node of nodeResults){
        addValue(node.utctime, arrT);
    }
    CTime = getHighest(arrT);

    // Concensus of block
    arrT = [];
    for(node of nodeResults){
        addValue(node.lastblock, arrT);
    }
    CBlock = getHighest(arrT);

    // Concensus of branch
    arrT = [];
    for(node of nodeResults){
        addValue(node.branch, arrT);
    }
    CBranch = getHighest(arrT);

    // Concensus of pendings
    arrT = [];
    for(node of nodeResults){
        addValue(node.pendings, arrT);
    }
    CPending = getHighest(arrT);

    let selectedNode = getRandomServer(CBlock, CBranch, CPending);

    // console.log(" ");
    // console.log("# Consensus Completed: ")
    // console.log("# Time: ",CTime);
    // console.log("# Block: ",CBlock);
    // console.log("# Branch: ",CBranch);
    // console.log("# Pendings: ",CPending);

    if(CBlock > LastBlock){
        getTCPSummary(selectedNode.address,selectedNode.port, CBlock, CBranch);
    }

    if(CPending != LastPendingCount){
        getTCPPendings(selectedNode.address, selectedNode.port, CPending);
    }
}

function getRandomServer(block, branch, pendings){
    let candidates = [];

    for(node of nodeResults){
        if(
            node.branch == branch &&
            node.lastblock == block &&
            node.pendings == pendings
        ){
            candidates.push(node);
        }
    }

    if(candidates.length > 0){
        const index = Math.round(Math.random() * (candidates.length - 1));
        return candidates[index];
    }
    
    return new NodeInfo("","","","","","","");
}

function getHighest(arrT){
    let Maximum = 0;
    let MaxIndex = 0;

    for(cd of arrT){
        if(cd.count > Maximum){
            Maximum = cd.count;
            MaxIndex = arrT.indexOf(cd);
        }   
    }

    return arrT[MaxIndex].value;
}

function addValue(tvalue, arrT){
    let added = false;
    
    for(cd of arrT){
        if(tvalue == cd.value){
            cd.count++;
            added = true;
            break;
        }
    }

    if(!added){
        let ThisItem = new ConcensusData(
            tvalue,
            1        
        );
        arrT.push(ThisItem);
    }
}

function stringToNodeInfo(input, address, port){
    const values = input.split(" ");

    let newNode = new NodeInfo(
        address,
        port,
        values[1], // Connections
        values[2], // LastBlock
        values[3], // Pendings
        values[4], // Delta
        values[5], // Branch
        values[6], // Version
        values[7]  // UTCtime
    );

    return newNode;
}

const getTCPNodeStatus = (host, port = 8080) => {
    const client = new Net.Socket();
    let data;

    client.setTimeout(1500, () => {
        client.end();
        client.destroy();
        pendingNodes--;
        if(pendingNodes == 0) Consensus();
    })
    
    client.connect({port: port, host: host}, function() {
        client.write("NODESTATUS\n");
    });

    client.on("data", function(chunk){
        if(data != undefined){
            data = Buffer.concat([data, chunk]);
        }else{
            data = chunk;
        }
    });

    client.on("end", function(){
        pendingNodes--;
        if(data != undefined){
            lastNodeStatus = data.toString();
            nodeResults.push(stringToNodeInfo(data.toString(), host, port));
            if(pendingNodes == 0) Consensus();
            client.destroy();
        }
    });
}

const getLastConsensus = async(request, response) => {
    let result = {
        LastBlock: LastBlock,
        LastBranch: LastBranch,
        Pendings: LastPendings
    }
    return response.status(200).send(result);
}

const getTCPPendings = async(host, port = 8080, CPending) => {
    //console.log(`Requesting Pendings to: ${host}:${port}`);
    
    const client = new Net.Socket();
    let data;
    client.connect({port: port, host: host}, function() {
        client.write("NSLPEND\n");
    });

    client.on("data", function(chunk){
        if(data != undefined){
            data = Buffer.concat([data, chunk]);
        }else{
            data = chunk;
        }
    });

    client.on("end", function(){
        if(data == undefined){
            LastPendings = "";
        }else{
            LastPendings = data.toString();
        }
        LastPendingCount = CPending;
        client.destroy();
    });
}

const getPendings = async(request, response) => {
    return response.status(200).send(lastPendings);
}

const getTCPSummary = async(host, port = 8080, CBlock, CBranch) => {
    //console.log(`Requesting Summary to: ${host}:${port}`);
    const client = new Net.Socket();
    let data;
    client.connect({port: port, host: host}, function() {
        client.write("GETZIPSUMARY\n");
    });

    client.on("data", function(chunk){
        if(chunk.length > 17){
            if(data != undefined){
                data = Buffer.concat([data, chunk]);
            }else{
                data = chunk;
            }
        }
    });
    
    client.on("end", function(){
        LastSummary = data;
        LastBlock = CBlock;
        LastBranch = CBranch;
    });
}


const getSummary = async(request, response) => {
    response.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="summary.zip"'
    });
    return response.status(200).send(LastSummary);
}

module.exports = {
    getRoot,
    getLastConsensus,
    getPendings,
    getSummary,
    SyncNodes
}