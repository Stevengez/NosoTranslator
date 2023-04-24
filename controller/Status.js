const { getNetworkTime, pingMongoDB } = require('../repository');

const getApiStatus = async (req, res) => {
    res.status(200).send({
        isError: false,
        result: "API TEST SUCCESSFUL",
        apiVersion: "2.1.7"
    });
}
const getTime = async (req, res) => {
    let response = await getNetworkTime();
    res.status(200).send(response);
}

const getLoaderValidation = async(req, res) => {
    res.status(200).send("loaderio-8d359e40e3239bd2abda62b767fee952");
}

const testMongoDB = async (req, res) => {
    let result = await pingMongoDB();
    res.status(200).send(result);
}

module.exports = {
    getLoaderValidation,
    testMongoDB,
    getApiStatus,
    getTime
};