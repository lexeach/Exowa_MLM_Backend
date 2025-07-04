const { web3 } = require('../contracts/index');
const { encryptPrivateKey } = require('./privateKey');

const createdAccount = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const accounts = web3.eth.accounts.create();
            const privateKey = await encryptPrivateKey(accounts.privateKey);
            resolve({ address: accounts.address, privateKey });
        } catch (error) {
            reject(error);
        }
    })
}

const privateKeyToAccount = (private_key) => {
    return new Promise((resolve, reject) => {
        try {
            let address = web3.eth.accounts.privateKeyToAccount(private_key).address;
            resolve(address);
        } catch (error) {
            reject(error);
        }
    })
}

module.exports = {
    createdAccount,
    privateKeyToAccount
}
