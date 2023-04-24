const Wallet = require("../types/Wallet");
const JsZip = require('jszip');
const GVT = require("../types/GVT");
const Zip = new JsZip();

const getGvtFileStartIndex = (buffer, header = 50) => {
    let c = 0;
    for(let v of buffer){
        if (v === 4) {
            return c+1;
        }
        c++;
    }
}

const getZipStartIndex = (buffer, header = 100) => {
    let c = 0;
    for(let v of buffer){
        if (v === 80 && buffer[c+1] === 75) {
            return c;
        }
        c++;
    }
}

const expandSummary = async (pendingList, rawSummaryData) => {
    let summaryList;
    try {
        // Find Actual Zip Start to Remove File Tag and SUM
        let breakCounter = getZipStartIndex(rawSummaryData);

        const zip = await Zip.loadAsync(rawSummaryData.subarray(breakCounter));
        //console.log("Summary zip checked- OK");

        const filename = Object.keys(zip.files)[0];
        let summaryBytes = await zip.files[filename].async('uint8array');

        summaryList = [];
        let lastWhale = 0;
        while (summaryBytes.length > 0) {
            let packedRecord = summaryBytes.subarray(0, 106);

            //Wallet Values
            let address = new TextDecoder().decode(packedRecord.subarray(1, packedRecord[0] + 1));
            let custom = new TextDecoder().decode(packedRecord.subarray(42, 42 + packedRecord[41]));
            let balanceArray = packedRecord.subarray(82, 90);
            let balance = Buffer.from(balanceArray).readBigInt64LE(0, balanceArray.length);

            // New Wallet Object
            const newWallet = new Wallet(address, custom, balance);

            // Fill Pendings for Wallet If exists any
            for(let pendingInfo of pendingList){
                if (newWallet.address === pendingInfo.sender) {
                    newWallet.outgoing = BigInt(newWallet.outgoing) + BigInt(pendingInfo.amount) + BigInt(pendingInfo.fee);
                }

                if (newWallet.address === pendingInfo.receiver) {
                    newWallet.incoming = BigInt(newWallet.incoming) + BigInt(pendingInfo.amount);
                }
            }

            // Add to Summary List
            summaryList.push(newWallet);
            // Move Array to next wallet block
            summaryBytes = summaryBytes.subarray(106);
        }

        //Sort Descending by balance
        summaryList.sort((a,b) => Number(b.balance-a.balance));

        return {
            isError: false,
            result: summaryList
        };
    }catch (e) {
        throw { isError: true, result: e.message, stack: e.stack};
    }
}

const expandGvtList = (rawGVTsData) => {
    let GVTList = [];
    try {
        let breakCounter = getGvtFileStartIndex(rawGVTsData);

        let gvtBytes = rawGVTsData.subarray(breakCounter);
        while(gvtBytes.length > 0){
            let packedRecord = gvtBytes.subarray(0,105);
            let number = new TextDecoder().decode(packedRecord.subarray(1, packedRecord[0]+1));
            let owner = new TextDecoder().decode(packedRecord.subarray(4, 4+packedRecord[3]));
            let hash = new TextDecoder().decode(packedRecord.subarray(37, 37+packedRecord[36]));

            let nGvt = new GVT(number, owner, hash);
            GVTList.push(nGvt);

            gvtBytes = gvtBytes.subarray(105);
        }
        return {
            isError: false,
            result: GVTList
        };
    }catch (e) {
        throw { isError: true , result: e.message, stack: e.stack };
    }
}

exports.expandSummary = expandSummary;
exports.expandGvtList = expandGvtList;