class PendingInfo {
    constructor(TO_Type, TO_Sender, TO_Receiver, TO_Amount, TO_Fee){
        this.type = TO_Type;
        this.sender = TO_Sender;
        this.receiver = TO_Receiver;
        this.amount = TO_Amount;
        this.fee = TO_Fee;
    }
}

module.exports = PendingInfo;