const repository = require('../repository');

const redirectRPC = async (req, res) => {
    try{
        let result = await repository.getRPCcommand(req.body);
        res.status(200).send(result);
    }catch(e){
        res.status(200).send({
            isError: true,
            message: e.message,
            stack: e.stack
        })
    }
}

module.exports = {
    redirectRPC
}