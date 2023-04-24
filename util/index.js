const NodeInfo = require("../types/NodeInfo");
const PendingInfo = require("../types/PendingInfo");

const stringToNodeInfo = (input, address, port) => {
    const values = input.split(" ");
    return new NodeInfo(
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
}


const stringToOrderList = async (input) => {
    let orderList = [];
    let tokens = input.split(" ");
    if(tokens[1] === 'ERROR\r\n'){
        return {
            isError: true,
            code: 8001,
            list: []
        };
    }else{
        tokens = tokens.slice(2);
        for(let t of tokens){
            const orderData = t.split(":");
            orderList.push({
                sender: orderData[0],
                receiver: orderData[1],
                amount: orderData[2],
                reference: orderData[3],
                orderId: orderData[4]
            });
        }
    }

    return {
        isError: false,
        list: orderList
    };
}

const stringToOrderData = (input) => {
    const tokens = input.split(",");
    return new PendingInfo(
        tokens[0],
        tokens[1],
        tokens[2],
        tokens[3],
        tokens[4]
    )
}

const stringToMNList = (input) => {
    let mnList = [];
    let tokens = input.split(" ");
    const CBlock = tokens[0];
    tokens = tokens.slice(1);
    for(let t of tokens){
        const nodeData = t.replace(";",":").split(":");
        mnList.push({
            address: nodeData[0],
            port: nodeData[1],
            count: nodeData[3],
            rep: 10
        });
    }

    return {
        block: CBlock,
        list: mnList
    };
}

exports.stringToNodeInfo = stringToNodeInfo;
exports.stringToOrderData = stringToOrderData;
exports.stringToMNList = stringToMNList;
exports.stringToOrderList = stringToOrderList;