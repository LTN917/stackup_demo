import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { Presets, Client } from "userop";

dotenv.config();
const signingKey = process.env.SIGNING_KEY || ""; // private key
const rpcUrl = process.env.RPC_URL || "";

// 首先批准（approve）一個特定的地址以轉移一定數量的 erc20 代幣，然後轉移（transfer）該數量的代幣到該地址
async function approveAndSendToToken(
    to:string,
    token:string,
    value:string
):Promise<any[]>{
    const ERC20_ABI = require("./erc20Abi.json");
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl); // 連接到乙太網路節點
    const erc20 = new ethers.Contract(token,ERC20_ABI,provider); // 建立 erc20 合約實例
    const decimals = await Promise.all([erc20.decimals()]); // erc20 合約中查詢該代幣的小數點
    const amount = ethers.utils.parseUnits(value,decimals); // 將用戶提供 value 轉換成基礎最小單位的數量

    const approve ={
        to:token,
        value:ethers.constants.Zero,
        data:erc20.interface.encodeFunctionData("approve",[to,amount]),
    };

    const send ={
        to:token,
        value:ethers.constants.Zero,
        data:erc20.interface.encodeFunctionData("transfer",[to,amount]),
    };

    return [approve,send];
}

async function main(){

    // create a userOps builder
    const signer = new ethers.Wallet(signingKey); // 使用私鑰 signingKey 回來創建錢包實例
    const builder = await Presets.Builder.Kernel.init(signer, rpcUrl);
    const address = builder.getSender(); // 利用 builder 建立的 contract address
    console.log(`Account address: ${address}`);

    // create calldata
    const to = address;
    const token = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B";
    const value = "0";
    const calls = await approveAndSendToToken(to,token,value);
    builder.executeBatch(calls);
    console.log(builder.getOp());

    // send userOps to bundler
    const client = await Client.init(rpcUrl);
    const res = await client.sendUserOperation(builder, {
        onBuild: (op) => console.log("Signed UserOperation:", op),
    });
    console.log(`UserOpHash: ${res.userOpHash}`);
    console.log("Waiting for transaction...");
    const ev = await res.wait();
    console.log(`Transaction hash: ${ev?.transactionHash ?? null}`);
}

export default main();