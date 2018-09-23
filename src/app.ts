import * as express from 'express'
import * as bodyParser from "body-parser";
import * as Web3 from 'web3'
import * as Lightwallet from 'eth-lightwallet'
import * as isNullOrUndefined from 'util'
import * as HookedWeb3Provider from 'hooked-web3-provider'
import * as async from 'async'

import * as solc from 'solc'
import * as fs from 'fs'


let txutils = Lightwallet.txutils;
let signing = Lightwallet.signing;
let txOptions = Lightwallet.txOptions;

class App {
  public app: express.Application;
  public config: any;

  constructor () {
    this.config = {hostWeb3: 'https://rinkeby.infura.io/v3/3e9c0182d4494bef94a46c92223867f5'}
    this.app = express()
    this.bootstrap()
    this.mountRoutes()
  }


  private bootstrap(): void{
      // support application/json type post data
      this.app.use(bodyParser.json());
      //support application/x-www-form-urlencoded post data
      this.app.use(bodyParser.urlencoded({ extended: false }));
  }

  private mountRoutes (): void {

    const router = express.Router()
    router.get('/seed/:point', (req, res) => {
      if(isNullOrUndefined.isNullOrUndefined(req.params.point))
      {
        let error = { 
          isError: true,
          msg: "Error read parameter <point>"
        };
        res.status(400).json(error);
      }
      
      let seedPoint = req.params.point.toString();  
      let data = { 
        isError: false,
        seed: Lightwallet.keystore.generateRandomSeed(seedPoint) 
      };
      res.status(200).json(data);
    })
    .get('/', (req, res) => {
      res.status(200).json({message: 'Hello Word'});
    })

    //create new wallet ERC20
    router.post('/wallet', (req, res) => {
        console.log(req.body)
        if(isNullOrUndefined.isNullOrUndefined(req.body.seed))
        {
            let error = { 
                isError: true,
                msg: "Error read parameter <seed>"
            };
            res.status(400).json(error);
        }  
        
        if(isNullOrUndefined.isNullOrUndefined(req.body.password))
        {
            let error = { 
                isError: true,
                msg: "Error read parameter <password>"
            };
            res.status(400).json(error);
        }  
        let paramPassword = req.body.password.toString();
        let paramSeed = req.body.seed.toString();
        let numAddr = 1;

        Lightwallet.keystore.createVault({
            password: paramPassword,
            seedPhrase: paramSeed,
            //random salt 
            hdPathString: "m/0'/0'/0'"
          }, function (err, ks) { 
            ks.keyFromPassword(paramPassword, function(err, pwDerivedKey) {
                if(ks.isDerivedKeyCorrect(pwDerivedKey))
                {
                    ks.generateNewAddress(pwDerivedKey, numAddr);  
                    let data = {
                        wallet: ks
                    };
                    res.status(200).json(data);
                }else{  
                    let error = {
                        isError: true,
                        msg: 'Password incorret'
                    };
                    res.status(400).json(error);
                }  
            })
        })  
    })

    router.post('/eth/balance', (req, res) => {
        if(isNullOrUndefined.isNullOrUndefined(req.body.wallet))
        {
            let error = { 
                isError: true, 
                msg: "Error read Wallet Json"
            };
            res.status(400).json(error);
        }  
        if(isNullOrUndefined.isNullOrUndefined(req.body.password))
        {
            let error =  {
                isError: true,
                msg: "Error read parameter <password>"
            };
            res.status(400).json(error);
        }
        let walletJson = req.body.wallet;

        let ks = Lightwallet.keystore.deserialize(walletJson);
        let password = req.body.password.toString();
        ks.keyFromPassword(password, function(err, pwDerivedKey) {
            if(!err)
            {
                let addresses = ks.getAddresses();
                let web3Provider = new HookedWeb3Provider({
                    host: 'https://rinkeby.infura.io/v3/3e9c0182d4494bef94a46c92223867f5',
                    transaction_signer: ks
                });

                let web3 = new Web3();
                web3.setProvider(web3Provider);
                
                async.map(addresses, web3.eth.getBalance, function(err, balances) {
                    async.map(addresses, web3.eth.getTransactionCount, function(err, nonces) {
                        let balance = {
                            isError: false,
                            address: addresses[0],
                            balance: balances[0] / 1.0e18
                        };
                        res.status(200).json(balance);
                    })
                })
            }
            else{  
                let error = {
                    isError: true,
                    msg: err
                };
                res.status(400).json(error);
            }
        });
    });



    router.post('/contract/send', (req, res) => {
        if(isNullOrUndefined.isNullOrUndefined(req.body.wallet))
        {
            let error = {
                isError: true,
                msg: "Error read Wallet Json"
            };
            res.status(400).json(error);
        }  
        if(isNullOrUndefined.isNullOrUndefined(req.body.password))
        {
            let error =  { 
                isError: true,
                msg: "Error read parameter <password>"
            };
            res.status(400).json(error);
        }  
        if(isNullOrUndefined.isNullOrUndefined(req.body.to))
        {
            let error =  { 
                isError: true,
                msg: "Error read parameter <to>"
            };
            res.status(400).json(error);
        }  
        if(isNullOrUndefined.isNullOrUndefined(req.body.gasLimit))
        {
            let error =  { 
                isError: true,
                msg: "Error read parameter <gasLimit>"
            };
            res.status(400).json(error);
        }  
        if(isNullOrUndefined.isNullOrUndefined(req.body.gasPrice))
        {
            let error =  {
                isError: true,
                msg: "Error read parameter <gasPrice>"
            };
            res.status(400).json(error);
        }      
        if(isNullOrUndefined.isNullOrUndefined(req.body.value))
        {
            let error =  {
                isError: true,
                msg: "Error read parameter <value>"
            };
            res.status(400).json(error);
        }

        if(isNullOrUndefined.isNullOrUndefined(req.body.contractAddr))
        {
            let error =  {
                isError: true,
                msg: "Error read parameter <contractAddr>"
            };
            res.status(400).json(error);
        }      
        if(isNullOrUndefined.isNullOrUndefined(req.body.contractAbi))
        {
            let error =  {
                isError: true,
                msg: "Error read parameter <contractAbi>"
            };
            res.status(400).json(error);
        }



        let walletJson = JSON.stringify(req.body.wallet);
        let ks = Lightwallet.keystore.deserialize(walletJson);
        let password = req.body.password.toString();
        let contractAddr = req.body.contractAddress.toString();
        let contractAbi = req.body.contractAbi.toString()


        ks.keyFromPassword(password, function(err, pwDerivedKey) {
            if(ks.isDerivedKeyCorrect(pwDerivedKey))
            {
                if(ks.getAddresses()[0] == req.body.to)  
                {
                    let error = { 
                        isError: true,
                        msg: "Invalid Recipient"
                    };
                    res.status(400).json(error);
                }  

                let web3Provider = new HookedWeb3Provider({
                    host: this.config.hostWeb3,
                    transaction_signer: ks
                });      
                let web3 = new Web3();
                web3.setProvider(web3Provider); 
                
                let nonceNumber = parseInt(web3.eth.getTransactionCount(ks.getAddresses()[0], "pending"));
                let gasprices = parseInt(req.body.gasPrice) * 1000000000;
                let gasLimit = parseInt(req.body.gasLimit);
                let sendingAddr = ks.getAddresses()[0];
                let value = parseFloat(req.body.value) * 1.0e18   //Address wallet
                let txOptions = {
                    nonce: web3.toHex(nonceNumber),
                    gasLimit: web3.toHex(gasLimit),
                    gasPrice: web3.toHex(gasprices),
                    to: contractAddr
                }
                let arg = Array.prototype.slice.call([req.body.to,value]);
                let rawTx = txutils.functionTx(contractAbi, 'transfer', arg, txOptions)
                let signedSetValueTx = signing.signTx(ks, pwDerivedKey, rawTx, sendingAddr)
                web3.eth.sendRawTransaction('0x' + signedSetValueTx, function(err, hash) {
                    if(!isNullOrUndefined.isNullOrUndefined(err)){
                        let error =  { 
                            isError: true,
                            msg: err
                        };
                        res.status(400).json(error);
                    }   
                    if(!isNullOrUndefined.isNullOrUndefined(hash)){
                        let data = {
                            isError: false,
                            hash: hash
                        };
                        res.status(200).json(data);
                    }
                    else
                    {
                        let error = { 
                            isError: true,
                            msg: 'return hash is null'
                        };
                        res.status(400).json(error);
                    }
                }); 
            }
            else{
                let error = {
                    isError: true,
                    msg: 'Password incorrect'
                };
                res.status(400).json(error);
            }
        });
    });

    this.app.use('/', router)
  }
}

export default new App().app