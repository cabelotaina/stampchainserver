import * as express from 'express'
import * as bodyParser from "body-parser";
import * as Web3 from 'web3'
import * as Lightwallet from 'eth-lightwallet'
import * as isNullOrUndefined from 'util'
import * as HookedWeb3Provider from 'hooked-web3-provider'
import * as async from 'async'

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

                console.log(this)
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



    this.app.use('/', router)
  }
}

export default new App().app