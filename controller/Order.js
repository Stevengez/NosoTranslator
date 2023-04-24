const repository = require('../repository');
const mongo = require('../service/Mongo');
const { pendingList, pendingCount, summaryList } = require('../service/NosoProtocol');

const getPendings = async (req, res) => {
    if(summaryList().length === 0){
        res.status(200).send({
            isError: true,
            code: 7007,
            message: "Pendings not ready"
        });
    }else{
        res.status(200).send({
            isError: false,
            result: pendingList()
        });
    }
}

const getPendingCount = async (req, res) => {
    if(summaryList().length === 0){
        res.status(200).send({
            isError: true,
            code: 7007,
            message: "Pendings Count not ready"
        });
    }else{
        res.status(200).send({
            isError: false,
            result: pendingCount()
        });
    }
}

const getOrdersPage = async (req, res) => {
    try {
        const { page, pageSize } = req.query;
        let response = await repository.getOrders(page, pageSize);
        res.status(200).send(response);
    }catch(e){
        res.status(200).send(e);
    }
}

const getRecentOrders = async (req, res) => {
    try {
        let response = await repository.getOrders(0, 6);
        res.status(200).send(response);
    }catch(e){
        res.status(200).send(e);
    }
}

const insertOrder = async (req, res) => {
    try {
        const { orderData } = req.body;
        let result = await mongo.insertOrder(orderData);
        res.status(200).send(result);
    }catch(e){
        res.status(200).send({
            isError: true,
            result: e.message
        });
    }
}


module.exports = {
    getPendings,
    getPendingCount,
    getRecentOrders,
    getOrdersPage,
    insertOrder
}