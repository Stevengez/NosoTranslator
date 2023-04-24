const { Address, Status, GVT, Block, Order, RPC } = require("../controller");
const router = require('express').Router();

module.exports = () => {
    router.get('/', Status.getApiStatus);
    router.get('/Mongo', Status.testMongoDB);
    router.get('/loaderio-8d359e40e3239bd2abda62b767fee952', Status.getLoaderValidation);
    router.get('/Time', Status.getTime);
    
    router.get('/Address/:address', Address.getStats);
    router.get('/Address/:address/History', Address.getAddressHistory);
    router.get('/Address/Top/:limit', Address.getTopAddress);

    router.get('/GVT/:gvtHash', GVT.getGvt);

    router.post('/Block', Block.updateBlock);
    router.get('/Block/:block', Block.getBlockStats);
    router.get('/Block/:block/Txs', Block.getBlockTxs);
    router.get('/LastBlock', Block.getLastBlock);
    router.get('/DBLastBlock', Block.getDBLastBlock);

    router.get('/Pendings', Order.getPendings);
    router.get('/PendingCount', Order.getPendingCount);
    
    router.get('/Orders', Order.getOrdersPage);
    router.get('/Orders/Recent', Order.getRecentOrders);
    router.post('/Orders', Order.insertOrder);

    router.post('/RPC', RPC.redirectRPC);

    return router;
}