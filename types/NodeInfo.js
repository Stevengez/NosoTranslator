class NodeInfo {
    constructor(
        address,
        port,
        connections,
        lastblock,
        pendings,
        delta,
        branch,
        version,
        utctime
    ){
        this.address = address;
        this.port =port;
        this.connections = connections
        this.lastblock = lastblock
        this.pendings = pendings
        this.delta = delta
        this.branch = branch
        this.version = version
        this.utctime = utctime
    }
}

module.exports = NodeInfo;