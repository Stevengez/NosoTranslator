const repository = require('../repository');
const { summaryList, gvtList } = require("../service/NosoProtocol");

const getStats = (req, res) => {
    if(summaryList().length === 0 || gvtList().length === 0){
        res.status(200).send({
            isError: true,
            code: 7007,
            message: "Summary/GVTs not ready"
        });
    }else{
        const { address } = req.params;
        let foundValue = summaryList().find((w) => (w.address === address || w.custom === address) );
        if(foundValue){
            foundValue = {
                address: foundValue.address,
                custom: foundValue.custom,
                balance: foundValue.balance.toString(),
                incoming: foundValue.incoming.toString(),
                outgoing: foundValue.outgoing.toString(),
                gvt: gvtList().filter((g) => g.owner === foundValue.address)
            }

            res.status(200).send({
                isError: false,
                result: foundValue
            });
        }else{
            res.status(200).send({
                isError: true,
                result: "Address/Alias not found"
            });
        }
    }
}

const getAddressHistory = async (req, res) => {
    try {
        const { address } = req.params;
        const { page, pageSize } = req.query;
        const response = await repository.getAddressHistory(address, page, pageSize);
        res.status(200).send(response);
    }catch(e) {
        res.status(200).send(e);
    }
}

const getTopAddress = async (req, res) => {
    try {
        if(summaryList().length === 0){
            res.status(200).send({
                isError: true,
                code: 7007,
                message: "Summary not ready"
            });
        }else{
            const { limit } = req.params;
            res.status(200).send({
                isError: false,
                result: summaryList().slice(0,limit).map((a) => {
                    return {
                        address: a.address,
                        custom: a.custom,
                        balance: a.balance.toString(),
                        incoming: a.incoming.toString(),
                        outgoing: a.outgoing.toString()
                    }
                })
            });
        }
    }catch(e){
        res.status(200).send({
            isError: true,
            result: e.message
        });
    }
}

module.exports = {
    getStats,
    getAddressHistory,
    getTopAddress
}