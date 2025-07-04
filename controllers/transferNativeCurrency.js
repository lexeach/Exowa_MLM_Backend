const { web3, userNativeBalance, formatedBalance } = require("../contracts");
const { dcryptPrivateKey } = require("./privateKey");


const transferNativeCurrency = (privateKey, toAddress, amount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const private_key = await dcryptPrivateKey(privateKey);
            const walletAddress = web3.eth.accounts.privateKeyToAccount(private_key).address;
            const gasPrice = await web3.eth.getGasPrice();
            const balance = await userNativeBalance(walletAddress);
            const formatedBalances = await formatedBalance(balance, 18);

            if (Number(formatedBalances) < Number(amount)) {
                throw new Error('Insufficient Balance for transfer');
            }
            const amountToSend = web3.utils.toWei(amount.toString(), 'ether');
            const gasEstimate = await web3.eth.estimateGas({
                to: toAddress,
                value: amountToSend,
            });
            const transactionObject = {
                from: walletAddress,
                to: toAddress,
                value: amountToSend,
                gas: gasEstimate,
                gasPrice,
            };

            const signedTransaction = await web3.eth.accounts.signTransaction(transactionObject, private_key);

            const transactionReceipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

            resolve(transactionReceipt);

        } catch (error) {
            reject(error);
        }
    })
}

module.exports = transferNativeCurrency