const { web3, tokenInstance, tokenAddress, EthToWei } = require('../contracts/index');
const feesManager = require('./feesManager');
const getTokenInfo = require('./getTokenInfo');
const { dcryptPrivateKey } = require('./privateKey');

const transferToken = async (privateKey, toAddress, amount) => {
    try {
        const private_key = await dcryptPrivateKey(privateKey);
        const walletAddress = web3.eth.accounts.privateKeyToAccount(private_key).address;
        const tokenContract = await tokenInstance(tokenAddress);
        const balances = await getTokenInfo(tokenAddress, walletAddress);

        if (Number(balances.formatted) < Number(amount)) {
            throw new Error("Insufficient Balance for transfer");
        }

        const payAmount = await EthToWei(amount, balances.decimals);

        let balanceFees = await web3.eth.getBalance(walletAddress);
        const formattedBalanceFees = web3.utils.fromWei(balanceFees.toString(), "ether");

        // Check if there's enough balance for transaction fees
        if (Number(formattedBalanceFees) < 0.0002) {
            // Pay transaction fees from manager wallet if not enough BNB
            await feesManager(walletAddress, "0.0002");
            // Re-fetch balance after fee payment
            balanceFees = await web3.eth.getBalance(walletAddress);
        }

        const transaction = tokenContract.methods.transfer(toAddress, payAmount.toString());

        let gasPrice = await web3.eth.getGasPrice();
        const gasEstimate = await transaction.estimateGas({ from: walletAddress });


        const tx = {
            from: walletAddress,
            to: tokenAddress,
            gasPrice: gasPrice,
            gas: gasEstimate,
            data: await transaction.encodeABI(),
            nonce: await web3.eth.getTransactionCount(walletAddress) // Ensure correct nonce
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, private_key);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        return receipt; // Resolve with the receipt

    } catch (err) {
        console.error("Transaction failed:", err);
        throw err; // Reject with the error
    }
};

module.exports = transferToken;
