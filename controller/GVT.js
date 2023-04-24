const { gvtList } = require('../service/NosoProtocol')

const getGvt = async (req, res) => {
    if(gvtList().length === 0){
        res.status(200).send({
            isError: true,
            code: 7007,
            result: "GVT list not ready."
        })
    }else{
        const { gvtHash } = req.params;
        let candidate = gvtList().find((g) => g.hash === gvtHash || g.number === gvtHash);
        if(candidate){
            res.status(200).send({
                isError: false,
                result: candidate
            });
        }else{
            res.status(200).send({
                isError: true,
                code: 8008,
                result: "GVT not found."
            });
        }
    }
}

module.exports = {
    getGvt
}