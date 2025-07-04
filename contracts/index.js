require("dotenv").config();
const { Web3 } = require("web3");
const NETWORK = process.env.NETWORK;

// const chainId = NETWORK == "mainnet" ? 56 : 97;

const rpc = NETWORK == "mainnet" ? "https://bsc-dataseed.binance.org/" : "https://data-seed-prebsc-1-s1.binance.org:8545/";

const tokenAddress = NETWORK == "mainnet" ? "0x55d398326f99059fF775485246999027B3197955" : "0x4aEbB95f517f2992ea5697AC2808CB2e5Ad43D66";

const tokenAbi = require("./tokenAbi.json");

let weiUnits = { 3: "kwei", 6: "mwei", 9: "gwei", 12: "szabo", 15: "finney", 18: "ether", 21: "kether" };

let web3 = new Web3(rpc);

// token contract instance.................
const tokenInstance = (token_ddress) => {
    return new Promise((resolve, reject) => {
        try {
            let tokenContract = new web3.eth.Contract(tokenAbi, token_ddress);
            resolve(tokenContract);
        } catch (err) {
            reject(err);
        }
    })
}

const formatedBalance = (amount, decimals) => {
    return new Promise((resolve, reject) => {
        try {
            if (Number(amount > 0)) {
                let decimalString = weiUnits[decimals];
                let formattedValue = web3.utils.fromWei(amount.toString(), decimalString);
                resolve(formattedValue);
            } else {
                resolve("0.00")
            }
        } catch (error) {
            reject(error)
        }
    })
}

const EthToWei = (amount, decimals) => {
    return new Promise((resolve, reject) => {
        try {
            let decimalString = weiUnits[decimals];
            let weiValue = web3.utils.toWei(amount.toString(), decimalString);
            resolve(weiValue);
        } catch (error) {
            reject(error)
        }
    })
}

const userNativeBalance = (userAddress) => {
    return new Promise(async (resolve, reject) => {
        try {
            let balance = await web3.eth.getBalance(userAddress);
            resolve(balance);
        } catch (err) {
            reject(err);
        }
    })
}


const userTokenBalance = (userAddress) => {
    return new Promise(async (resolve, reject) => {
        try {
            const tokenContract = await tokenInstance(tokenAddress);
            if (userAddress != "" && userAddress != undefined) {
                let isAddress = web3.utils.isAddress(userAddress.toString());
                if (!isAddress) throw new Error("Provide a valid address.");
                const balance = (await tokenContract.methods.balanceOf(userAddress).call()).toString();
                resolve(balance);
            } else {
                throw new Error("Provide the wallet address.")
            }
        } catch (err) {
            reject(err);
        }
    })
}


module.exports = {
    web3,
    tokenAbi,
    tokenAddress,
    tokenInstance,
    formatedBalance,
    userNativeBalance,
    userTokenBalance,
    EthToWei,
}