import * as express from 'express'
import * as bodyParser from 'body-parser';
import * as Web3 from 'web3'
import * as Lightwallet from 'eth-lightwallet'
import * as isNullOrUndefined from 'util'
import * as HookedWeb3Provider from 'hooked-web3-provider'
import * as async from 'async'
import * as tx from 'ethereumjs-tx'
import * as cors from 'cors'



const SignerProvider = require('ethjs-provider-signer');
const sign = require('ethjs-signer').sign;
const Eth = require('ethjs-query');


let contractAbi = require('./contract_abi.json')


const options:cors.CorsOptions = {
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"],
  credentials: true,
  methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
  origin: 'http://localhost:8100',
  preflightContinue: true
};


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
    router.use(cors(options))
    router.options("*", cors(options))
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



    // create new contract size get endpoint

    router.post('/contract/size', (req, res) => {

      let ks = Lightwallet.keystore.deserialize(req.body.wallet);
      let contractAddr = '0xCB42357f9E1C41db449a7D2b557635175eC9899A';

      let web3Provider = new HookedWeb3Provider({
          host: this.config.hostWeb3,
      });  
      let web3 = new Web3();
      web3.setProvider(web3Provider); 
      let contract = new web3.eth.Contract(contractAbi, contractAddr);

      contract.methods.size().call({from: ks.getAddresses()[0]}, (error, size) => {
        if (!error) {
          res.status(200).json({size: size});
        } else {
          res.status(400).json({error: error});
        }
      });

    });


    // create new get day of work endpoint

    router.post('/contract/day', (req, res) => {

      let ks = Lightwallet.keystore.deserialize(req.body.wallet);
      let contractAddr = '0xCB42357f9E1C41db449a7D2b557635175eC9899A';

      let web3Provider = new HookedWeb3Provider({
          host: this.config.hostWeb3,
      });  
      let web3 = new Web3();
      web3.setProvider(web3Provider); 
      let contract = new web3.eth.Contract(contractAbi, contractAddr);

      contract.methods.getDayOfWork(req.body.index.toString()).call({from: ks.getAddresses()[0]}, (error, result) => {
        if (!error) {
          res.status(200).json({size: result});
        } else {
          res.status(400).json({error: error});
        }
      });

    });


    router.post('/contract/hash/', (req, res) => {
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
        if(isNullOrUndefined.isNullOrUndefined(req.body.hash))
        {
            let error =  { 
                isError: true,
                msg: "Error read parameter <hash>"
            };
            res.status(400).json(error);
        }

        // let walletJson = JSON.stringify(req.body.wallet);
        let ks = Lightwallet.keystore.deserialize(req.body.wallet);
        // let ks = Lightwallet.upgrade.upgradeOldSerialized(walletJson, req.body.password.toString(), (result1, result2) => {})

        let password = req.body.password.toString();
        ks.keyFromPassword(password, function(err, pwDerivedKey) {  
            if(ks.isDerivedKeyCorrect(pwDerivedKey))
            {
                let web3Provider = new HookedWeb3Provider({
                    host: 'https://rinkeby.infura.io/v3/3e9c0182d4494bef94a46c92223867f5',
                    transaction_signer: ks
                });
                let web3 = new Web3();
                web3.setProvider(web3Provider);

                let contractAddr = '0xCB42357f9E1C41db449a7D2b557635175eC9899A';
                
                // web3.eth.getTransactionCount(ks.getAddresses()[0], "pending");

                web3.eth.getTransactionCount(ks.getAddresses()[0], "pending")
                .then((nonceNumber) => {
                  let gasprices = parseInt(req.body.gasPrice) * 1000000000;
                  let gasLimit = parseInt(req.body.gasLimit);
                  let sendingAddr = ks.getAddresses()[0];
                  let txOptions = {
                      nonce: web3.utils.toHex(nonceNumber),
                      gasLimit: web3.utils.toHex(gasLimit),
                      gasPrice: web3.utils.toHex(gasprices),
                      to: contractAddr,
                  }
                  let arg = Array.prototype.slice.call([req.body.hash, parseFloat('0')]);

                  let rawTx = txutils.functionTx(contractAbi, 'addDayOfWork', arg, txOptions)
                  let signedSetValueTx = signing.signTx(ks, pwDerivedKey, rawTx, sendingAddr)
                  web3.eth.sendSignedTransaction('0x' + signedSetValueTx, function(err, hash) { 
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
                });
            }
            else{  
                let error = {
                    isError: true,
                    msg: 'Password incorret'
                };      
                res.status(400).json(error);
            }
        });
    });

    this.app.use('/', router)
  }
}

export default new App().app