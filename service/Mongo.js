const repository = require('../repository');

const insertOrder = async (orderData) => {
    let sender = await repository.getAddress(orderData.sender, orderData.block);
    let receiver = await repository.getAddress(orderData.receiver, orderData.block);

    let newTx = await repository.createOrder({
        orderid: orderData.orderid,
        block: orderData.block,
        timestamp: orderData.timestamp,
        amount: orderData.amount,
        fees: orderData.fees,
        reference: orderData.reference?orderData.reference:"",
        sender: orderData.sender,
        receiver: orderData.receiver
    });

    let joinSender = await repository.addOrderToAddress(sender._id, newTx);
    let joinReceiver = await repository.addOrderToAddress(receiver._id, newTx);
    
    return {
        isError: false,
        result: {
            order: newTx,
            sender: joinSender,
            receiver: joinReceiver
        }
    }
}



exports.insertOrder = insertOrder;