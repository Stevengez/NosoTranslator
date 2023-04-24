const repository = require('../repository');
const { stringToNodeInfo, stringToMNList} = require('../util');
const config = require('../config.json');
const ConsensusData = require("../types/ConsensusData");

let SeedNodes = []; // Nodes available to sync
let LastBlockSinceMNUpdate = 0; // Block when Seeds Were Updated last time
let NodeList = []; // Nodes that were reached during NodeStatus for Consensus
let LastBlock = 0;
let LastPendingCount = 0;
let PendingList = [];
let SummaryList = [];
let GvtList = [];

const lastBlock = () => { return LastBlock; }
const summaryList = () => { return SummaryList; }
const gvtList = () => { return GvtList; }
const nodeList = () => { return NodeList; };
const pendingList = () => { return PendingList };
const pendingCount = () => { return LastPendingCount };

const setNewValues = (consensusResult) => {
    if(consensusResult.isError){
        console.log("Failed to finish consensus: ", consensusResult.result);
    }else{
        if(consensusResult.result.isNewBlock){
            LastBlock = consensusResult.result.block;
            SummaryList = consensusResult.result.summaryList;
            GvtList = consensusResult.result.gvtList;
            console.log("Consensus Finished - OK")
        }

        if(consensusResult.result.pendings !== LastPendingCount){
            LastPendingCount = consensusResult.result.pendings;
            PendingList = consensusResult.result.pendingList;
        }
    }
}

const SyncCycle = async () => {
    try {
        //Run initial sync cycle
        NodeList = await SyncNodes();
        let consensusResult = await Consensus(NodeList, PendingList, LastPendingCount, LastBlock);
        setNewValues(consensusResult);

        //Schedule Cycle for Every 10sec
        setInterval(async () => {
            NodeList = await SyncNodes();
            let consensusResult = await Consensus(NodeList, PendingList, LastPendingCount, LastBlock);
            setNewValues(consensusResult);
        }, 10000);
    } catch (e) {
        console.log({
            isError: true,
            result: e.message,
            stack: e.stack
        });
    }
}

const SyncNodes = async() => {
    if(LastBlockSinceMNUpdate === 0 || (LastBlockSinceMNUpdate + 12) === LastBlock){
        await UpdateSeedNodes();
    }

    let nodeList = [];
    let nodeStatusTasks = []
    for(let node of SeedNodes.filter(n => n.rep > 0)){
        nodeStatusTasks.push(
            repository.getNodeStatus([{ address: node.address, port: node.port }])
        );
    }

    let nodesResult = await Promise.all(nodeStatusTasks);
    nodesResult.forEach((response) => {
        if(!response.isError){
            let nodeInfo = stringToNodeInfo(response.result.toString(), response.address, response.port);
            nodeList.push(nodeInfo);
        }else{
            console.log("Node Sync Failed: ", response.address,":",response.port, response.result);
            let node = SeedNodes.find(n => n.address === response.address)
            if(node) node.rep--;
        }
    });
    return nodeList;
}

const UpdateSeedNodes = async () => {
    let retries = 0
    let newList = [];
    let tmpBlock = 0;
    while(newList.length === 0 && retries < 3){
        try {
            let result = await getMnList();
            tmpBlock = result.block;
            newList = result.list;
        }catch (e) {
            retries++;
        }
    }
    if(newList.length > 0){
        SeedNodes = newList;
        LastBlockSinceMNUpdate = tmpBlock
        console.log("SeedNodes updated [",tmpBlock,"]");
    }else{
        if(SeedNodes.length > 0){
            console.log("Failed to update SeedNodes, using old list.");
        }else{
            console.log("Failed to update SeedNodes, critical error, terminating.");
            throw new Error("Failed to update SeedNodes, critical error, terminating.");
        }
    }
}

const Consensus = async (nodeList, PendingList, LastPendingCount, LastBlock) => {
    let arrT = [];
    let CTime = 0;
    let CBlock = 0;
    let CBranch = 0;
    let CPending = 0;

    if(nodeList.length === 0){
        throw {
            isError: true,
            result: "Node list is empty, possible Fatal error, restarting service..."
        }
    }

    // NosoProtocol of unix time
    for(let node of nodeList){
        addValue(node.utctime, arrT);
    }
    CTime = getHighest(arrT);

    // NosoProtocol of block
    arrT = [];
    for(let node of nodeList){
        addValue(node.lastblock, arrT);
    }
    CBlock = getHighest(arrT);

    // NosoProtocol of branch
    arrT = [];
    for(let node of nodeList){
        addValue(node.branch, arrT);
    }
    CBranch = getHighest(arrT);

    // NosoProtocol of pendings
    arrT = [];
    for(let node of nodeList){
        addValue(node.pendings, arrT);
    }
    CPending = getHighest(arrT);

    let pendingList = PendingList;
    if (CPending !== LastPendingCount) {
        try {
            pendingList = await repository.getPendings(nodeList);
            CPending = pendingList.length;
        }catch (e) {
            if(CBlock > LastBlock){
                console.log("Get Pendings Failed, clearing until next sync");
                console.log("Node used (P) ", e.address, e.port);
                pendingList = []
            }else{
                console.log("Get Pendings Failed, no new block, keeping old list.");
                console.log("Node used (P) ", e.address, e.port);
            }
        }
    }

    let result = [[],[]];
    if(CBlock > LastBlock){
        let slTask = repository.getSummary(pendingList, nodeList)
        let glTask = repository.getGVTs(nodeList);
        result = await Promise.all([slTask, glTask]);
    }

    return {
        isError: false,
        result: {
            isNewBlock: CBlock > LastBlock,
            block: CBlock,
            pendings: CPending,
            branch: CBranch,
            pendingList: pendingList,
            summaryList: result[0].isError ? SummaryList:result[0].result,
            gvtList: result[1].isError ? GvtList:result[1].result
        }
    }
}

const getMnList = async () => {
    let response = await repository.getMNList(config.seedNodes);
    let result = stringToMNList(response.result.toString());
    let list = result.list;
    let validators = (list.length/10) + 3;

    //Sort Descending by number of blocks validated
    list.sort((a,b) => b.count-a.count);
    return {
        block: result.block,
        list: list.slice(0, validators)
    };
}

const getHighest = (arrT) => {
    let Maximum = 0;
    let MaxIndex = 0;

    for(let cd of arrT){
        if(cd.count > Maximum){
            Maximum = cd.count;
            MaxIndex = arrT.indexOf(cd);
        }
    }

    return arrT[MaxIndex].value;
}

const addValue = (tvalue, arrT) => {
    let added = false;

    for(let cd of arrT){
        if(tvalue === cd.value){
            cd.count++;
            added = true;
            break;
        }
    }

    if(!added){
        let ThisItem = new ConsensusData(
            tvalue,
            1
        );
        arrT.push(ThisItem);
    }
}

exports.SyncCycle = SyncCycle;
exports.summaryList = summaryList;
exports.gvtList = gvtList;
exports.lastBlock = lastBlock;
exports.nodeList = nodeList;
exports.pendingList = pendingList;
exports.pendingCount = pendingCount;