const { expandSummary, expandGvtList } = require('../service/Summary');
const { stringToOrderData, stringToOrderList} = require('../util');
//const NtpTimeSync = require("ntp-time-sync").NtpTimeSync;
const config = require('../config.json');
const Net = require('net');

//MONGO
const mongoose = require('mongoose');
const { Order, Address, Block } = require('./model');
const uri = `mongodb://${process.env.MONGO_API_USER}:${process.env.MONGO_API_PWD}@${process.env.MONGO_API_HOST}:${process.env.MONGO_API_PORT}/${process.env.MONGO_API_DB}?authMechanism=DEFAULT&authSource=${process.env.MONGO_API_DB}`;
mongoose.connect(uri).then((res) => {
    console.log("MongoDB Connected - OK");
}).catch((err) => {
    console.log("MongoDB Connected - ERR: ", err);
});

Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
}

const getRPCcommand = async (body, retries) => {
    try {
        let response = await fetch('http://127.0.0.1:8000', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        let parsed = await response.json();
        return parsed;
    }catch(e){
        if(retries < config.maxTcpRetries){
            await new Promise(r => setTimeout(r, 100*retries));
            return sendRPCcommand(body, retries+1);
        }else{
            throw {
                isError: true,
                message: e.message,
                stack: e.stack
            }
        }
    }
}


const sendTCPMessage = (nodeList, message) => {
    return new Promise((resolve, reject) => {
        if(nodeList.length === 0){
            return reject({ isError: true, result: "API not ready, retry later.", code: 7008 });
        }

        const targetNode = nodeList.slice().random();
        if(!targetNode.address || !targetNode.port){
            return reject({ isError: true, result: "HTTP/1.1 400 Bad Request", address: targetNode.address, port: targetNode.port});
        }

        const client = new Net.Socket();
        let data;
        let lastError = "";

        client.setTimeout(config.tcpTimeOut);

        client.on('timeout', () => {
            reject({ isError: true, result: "Connection Timed Out", address: targetNode.address, port: targetNode.port });
            client.destroy();
        });

        client.connect({ port: targetNode.port, host: targetNode.address }, () => {
            client.write(`${message}\n`);
        });

        client.on('error', (error) => {
            lastError = `TCP Conn Error to ${targetNode.address}:${targetNode.port} => ${error.message}`;
            console.log(lastError);

            switch (error.code) {
                case 'EHOSTUNREACH':
                case 'ENETUNREACH':
                case 'ECONNRESET':
                    reject({ isError: true, result: lastError, address: targetNode.address, port: targetNode.port });
                    client.destroy();
                    break;
                default:
                    console.log("Unhandled net error: ", error);
                    break;
            }
            if(error.code === 'EHOSTUNREACH'){

            }else if(error.code === 'ENETUNREACH'){
                reject({ isError: true, result: lastError });
                client.destroy();
            }
        });

        client.on('data', (chunk) => {
            if(data){
                data = Buffer.concat([data, chunk]);
            }else{
                data = chunk;
            }
        });

        client.on('end', () => {
            if(data){
                resolve({ isError: false, result: data, address: targetNode.address, port: targetNode.port });
            }else{
                reject({ isError: true, result: "Connection failed or no data received.", code: 9009, address: targetNode.address, port: targetNode.port });
            }
        });
    });
}

const getMNList = async (nodeList, retries = 1) => {
    try {
        return await sendTCPMessage(nodeList, 'NSLMNS');
    }catch (e) {
        if(retries < config.maxTcpRetries){
            await new Promise(r => setTimeout(r, 100*retries));
            return getMNList(nodeList, retries+1);
        }else{
            throw e;
        }
    }
}

const getBlockOrders = async (nodeList, block, retries = 2) => {
    try {
        let response = await sendTCPMessage(nodeList, 'NSLBLKORD '+block);
        return stringToOrderList(response.result.toString());
    }catch (e) {
        if(retries < config.maxTcpRetries){
            return getBlockOrders(nodeList, block, retries+1);
        }else{
            return e;
        }
    }
}
const getNodeStatus = async (nodeList, retries = 3) => {
    try {
        return await sendTCPMessage(nodeList, 'NODESTATUS');
    }catch (e) {
        if(retries < config.maxTcpRetries){
            await new Promise(r => setTimeout(r, 100*retries));
            return await getNodeStatus(nodeList, retries+1);
        }else{
            return e;
        }
    }
}
const getNetworkTime = async (retries = 1) => {
    try {
        /* Network Implementation
        let serverTime = await ntpClient.getTime();
        let date = new Date(serverTime.now);
        return {
            isError: false,
            result: date.getTime().toString()
        };
        */
        return {
            isError: false,
            result: Date.now().toString()
        }
    }catch (e) {
        if(retries < config.maxTcpRetries){
            await new Promise(r => setTimeout(r, 100*retries));
            return getNetworkTime(retries+1);
        }else{
            return {
                isError: true,
                result: e.message
            };
        }
    }
}

const getPendingList = (pendingsData) => {
    let pendingList = [];
    let tokens = pendingsData.split(" ");
    tokens.forEach((token) => {
        if(token !== ""){
            let pendingInfo = stringToOrderData(token);
            if(pendingInfo.type === "TRFR"){
                pendingList.push(pendingInfo);
            }
        }
    });
    return pendingList;
}
const getPendings = async (nodeList, retries = 1) => {
    try {
        let response = await sendTCPMessage(nodeList, 'NSLPEND');
        return getPendingList(response.result.toString());
    }catch (e) {
        if(e.code === 9009) return [];

        if(retries < config.maxTcpRetries){
            await new Promise(r => setTimeout(r, 100*retries));
            return getPendings(nodeList,retries+1);
        }else{
            throw e;
        }
    }
}
const getSummary = async (pendingList, nodeList, retries = 1) => {
    try {
        let response = await sendTCPMessage(nodeList, 'GETZIPSUMARY');
        return expandSummary(pendingList, response.result);
    }catch (e) {
        if(retries < config.maxTcpRetries){
            await new Promise(r => setTimeout(r, 100*(retries^2)));
            return getSummary(nodeList,retries+1);
        }else{
            return e;
        }
    }
}

const getGVTs = async (nodeList, retries = 1) => {
    try {
        let response = await sendTCPMessage(nodeList, 'NSLGVT');
        return expandGvtList(response.result);
    }catch (e) {
        if(retries < config.maxTcpRetries){
            await new Promise(r => setTimeout(r, 100*(retries^2)));
            return getGVTs(nodeList,retries+1);
        }else{
            return e;
        }
    }
}

/* Mongoo Queries */
const getOrders = async (offset = 0, pageSize = 6, retries = 1) => {
    try {
        //const conn = await mongoose.connect(uri);
        let result = await Order.find()
        //.select('-_id orderid block timestamp amount fees reference sender receiver')
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(pageSize);
        //mongoose.disconnect();
        return result;
    }catch(e){
        if(retries < config.maxTcpRetries){
            return await getOrders(offset, pageSize, retries+1);
        }else{
            throw {
                isError: true,
                code: 5005,
                result: e.message,
                stack: e.stack
            }
        }
    }
}

const getAddressHistory = async (address, page, pageSize, retries = 1) => {
    try {
        //const conn = await mongoose.connect(uri);
        let result = await Address.findOne({
            address: address
        })
        .populate({
            path: 'txs',
            select: '-_id orderid block timestamp amount fees reference sender receiver',
            options: {
                sort: { timestamp: -1 },
                skip: page*pageSize,
                limit: pageSize
            }
        })
        //mongoose.disconnect();
        return result.txs;
    }catch(e){
        if(retries < config.maxTcpRetries){
            return await getAddressHistory(address, retries+1);
        }else{
            throw {
                isError: true,
                code: 5005,
                result: e.message,
                stack: e.stack
            }
        }
    }
}

const getBlockTxs = async (block, page, pageSize, retries = 1) => {
    try {
        //const conn = await mongoose.connect(uri);
        let result = await Order.find({
            block: block
        })
        .select('-_id orderid block timestamp amount fees reference sender receiver')
        .sort({ timestamp: -1 })
        .skip(page*pageSize)
        .limit(pageSize);
        //mongoose.disconnect();
        return result;
    }catch(e){
        console.log("Error: ", e);
        if(retries < config.maxTcpRetries){
            return await getBlockTx(block, page, pageSize, retries+1);
        }else{
            throw {
                isError: true,
                code: 5005,
                result: e.message,
                stack: e.stack
            }
        }
    }
}

const getMongoLastBlock = async (retries = 1) => {
    try {
        //const conn = await mongoose.connect(uri);
        let exists = await Block.findOne({});
        if(exists){
            //mongoose.disconnect();
            return exists;
        }else{
            let result = await Block.create({
                highest: 0
            });
            //mongoose.disconnect();
            return result;
        }
    }catch(e){
        if(retries < 10){
            await new Promise(r => setTimeout(r, 100*retries));
            return await getLastBlock(retries +1);
        }else{
            throw {
                isError: true,
                result:  e.message,
                stack: e.stack
            }
        }
    }
}

const updateBlock = async (blockId, newBlock, retries = 1) => {
    try {
        //const conn = await mongoose.connect(uri);
        let response = await Block.findByIdAndUpdate(
            blockId,
            { highest: newBlock },
            { new: true, useFindAndModify: false }
        );
        //mongoose.disconnect();
        return response;
    }catch(e){
        if(retries < 10){
            await new Promise(r => setTimeout(r, 100*retries));
            return await updateBlock(blockId, newBlock, retries+1);
        }else{
            throw {
                isError: true,
                result:  e.message,
                stack: e.stack
            }
        }
    }
}

const getAddress = async (address, block, retries = 1) => {
    try {
        //const conn = await mongoose.connect(uri);
        let exists = await Address.findOne({ address: address });
        if(exists){
            //mongoose.disconnect();
            return exists;
        }else{
            let result = await Address.create({
                address: address,
                createdAt: block
            });
            //mongoose.disconnect();
            return result;
        }
    }catch(e){
        if(retries < 10){
            await new Promise(r => setTimeout(r, 100*retries));
            return await getAddress(address, block, retries +1);
        }else{
            throw {
                isError: true,
                result:  e.message,
                stack: e.stack
            }
        }
    }
}

const createOrder = async (order, retries = 1) => {
    try {
        //const conn = await mongoose.connect(uri);
        let exists = await Order.findOne({ orderid: order.orderid });
        if(exists){
            //mongoose.disconnect();
            return exists;
        }else{
            let result = await Order.create(order);
            //mongoose.disconnect();
            return result;
        }
    }catch(e){
        if(retries < 10){
            await new Promise(r => setTimeout(r, 100*retries));
            return await createOrder(order, retries+1);
        }else{
            throw {
                isError: true,
                result:  e.message,
                stack: e.stack
            }
        }
    }
}

const addOrderToAddress = async (addressId, order, retries = 1) => {
    try {
        //const conn = await mongoose.connect(uri);
        let response = await Address.findByIdAndUpdate(
            addressId,
            { $addToSet: { txs: order._id } },
            { new: true, useFindAndModify: false }
        );
        //mongoose.disconnect();
        return response;
    }catch(e){
        if(retries < 10){
            await new Promise(r => setTimeout(r, 100*retries));
            return await addOrderToAddress(addressId, order, retries+1);
        }else{
            throw {
                isError: true,
                result:  e.message,
                stack: e.stack
            }
        }
    }    
}

module.exports = {
    getMNList,
    getNodeStatus,
    getNetworkTime,
    getPendings,
    getSummary,
    getGVTs,
    getRPCcommand,

    getBlockOrders,

    getOrders,
    getAddressHistory,
    getBlockTxs,

    //Mongo
    getMongoLastBlock,
    updateBlock,
    getAddress,
    createOrder,
    addOrderToAddress
}