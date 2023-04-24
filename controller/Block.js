const repository = require('../repository');
const { nodeList, lastBlock } = require('../service/NosoProtocol');

const getBlockStats = async (req, res) => {
    const { block } = req.params;
    let result = await repository.getBlockOrders(nodeList(), block);
    res.status(200).send(result);
}

const getBlockTxs = async (req, res) => {
    try {
        const { block } = req.params;
        const { page, pageSize } = req.query;
        let result = await repository.getBlockTxs(block, page, pageSize);
        res.status(200).send({
            isError: false,
            result: {
                count: result.length,
                orders: result
            }
        });
    }catch(e){
        res.status(200).send(e);
    }
}

const getLastBlock = async (req, res) => {
    try {
        let cb = lastBlock();
        if(cb === 0){
            res.status(200).send({
                isError: true,
                code: 7007,
                result: "API not ready, retry later"
            });
        }else{
            res.status(200).send({
                isError: false,
                result: cb
            });
        }
    }catch(e){
        res.status(200).send({
            isError: true,
            result: e.message
        });
    }
}

const getDBLastBlock = async (req, res) => {
    try {
        let response = await repository.getMongoLastBlock();
        res.status(200).send({
            isError: false,
            result: response
        });
    }catch(e){
        res.status(200).send({
            isError: true,
            result: e.message
        });
    }
}

const updateBlock = async (req, res) => {
    try {
        const { blockid, block } = req.body;
        let result = await repository.updateBlock(blockid, block);
        res.status(200).send(result);
    }catch(e){
        res.status(200).send({
            isError: true,
            result: e.message
        });
    }
}

module.exports = {
    getBlockStats,
    getBlockTxs,
    getDBLastBlock,
    getLastBlock,
    updateBlock
}