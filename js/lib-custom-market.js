function TncLibCustomMarket(){

    this.getUrlParam = function(param_name) {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        return urlParams.get(param_name);
    };

    // ETHEREUM RINKEBY
    if(chain_id === "4") {

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '0x49E0a16C9E9C2cD1C644915bDD4edd529d418F2F', {from: this.account});
        this.account = '';

        // xDAI MAINNET
    } else if(chain_id === "64") {

        this.account = '';

        // xDAI / POA (Sokol) TESTNET
    } else if(chain_id === "4d") {

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '', {from: this.account});
        this.account = '';

        // Matic
    } else if(chain_id === "89") {

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '', {from: this.account});
        this.account = '';

        // BINANCE TESTNET
    } else if(chain_id === "61") {

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '', {from: this.account});
        this.account = '';

        // Moonbase Alpha
    } else if(chain_id === "507") {

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '', {from: this.account});
        this.account = '';

        // CELO
    } else if(chain_id === "a4ec") {

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '', {from: this.account});
        this.account = '';

        // BSC MAINNET
    } else if(chain_id === "38") {

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '', {from: this.account});
        this.account = '';

        // AVALANCHE
    } else if(chain_id === "a86a") {

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '', {from: this.account});
        this.account = '';

    } else{

        this.genesis = new web3.eth.Contract(customMarketGenesisABI, '', {from: this.account});
        this.account = '';

    }

    this.marketInstances = {};
    this.swapInstances = {};
    this.wrapInstances = {};

    let _self = this;

    this.setAccount = function(address){
        this.account = address;
    };

    this.contractInstancesCache = function(address, type){

        switch(type){

            case 'market':
                if(typeof _self.marketInstances[address] == "undefined"){
                    _self.marketInstances[address] = new web3.eth.Contract(customMarketABI, address, {from: _self.account});
                    return _self.marketInstances[address];
                }
                else
                {
                    return _self.marketInstances[address];
                }
                break;
            case 'swap':
                if(typeof _self.swapInstances[address] == "undefined"){
                    _self.swapInstances[address] = new web3.eth.Contract(customSwapABI, address, {from: _self.account});
                    return _self.swapInstances[address];
                }
                else
                {
                    return _self.swapInstances[address];
                }
                break;
            case 'wrap':
                if(typeof _self.wrapInstances[address] == "undefined"){
                    _self.wrapInstances[address] = new web3.eth.Contract(customWrapABI, address, {from: _self.account});
                    return _self.wrapInstances[address];
                }
                else
                {
                    return _self.wrapInstances[address];
                }
                break;
        }

        return null;
    };

    this.getMyMarketsLength = async function(){

        await sleep(sleep_time);

        return await this.genesis.methods.getUserMarketsLength(this.account).call({from:this.account});
    };

    this.getMyMarket = async function(index){

        await sleep(sleep_time);
        let wrapperAddress = await this.genesis.methods.userMarkets(this.account, index).call({from:this.account});
        console.log("my market: ", index, " - ", wrapperAddress);
        await sleep(sleep_time);
        let wrap = _self.contractInstancesCache(wrapperAddress, 'wrap');
        let marketUri = await wrap.methods.marketUri().call({from:this.account});

        let out = {wrapperAddress: wrapperAddress, uri: marketUri};

        return out;
    };

    this.getStakingAmounts = async function(){

        await sleep(sleep_time);
        let nifStakeTier1 = web3.utils.toBN(await this.genesis.methods.nifStakeTier1().call({from:this.account}));
        await sleep(sleep_time);
        let nifStakeTier2 = web3.utils.toBN(await this.genesis.methods.nifStakeTier2().call({from:this.account}));
        await sleep(sleep_time);
        let nifStakeTier3 = web3.utils.toBN(await this.genesis.methods.nifStakeTier3().call({from:this.account}));

        return {tier1: nifStakeTier1, tier2: nifStakeTier2, tier3: nifStakeTier3};
    };

    this.isStakingEnabled = async function(){

        let a = await this.getStakingAmounts();
        let one = web3.utils.toBN("1");
        let two = web3.utils.toBN("2");
        let three = web3.utils.toBN("3");
        return !( a.tier1.eq(one) && a.tier2.eq(two) && a.tier3.eq(three) );
    };

    this.newMarket = async function(
        controller,
        marketFee,
        marketSwapFee,
        tier,
        uri,
        stakingEnabled,
        preCallback,
        postCallback,
        errCallback)
    {

        console.log("fees: ", marketFee, " - ", marketSwapFee);

        let fee = 0;

        if(!stakingEnabled) {

            let haveWildcard = await this.iHaveAnyWildcard();
            await sleep(sleep_time);
            let nifBalance = web3.utils.toBN(await tncLib.nif.methods.balanceOf(this.account).call({from: this.account}));
            let feeMinNif = web3.utils.toBN(await this.getMinimumNif());

            console.log('Wilcard: ', haveWildcard, ' enough nif: ', nifBalance.lt(feeMinNif));

            if (!haveWildcard && nifBalance.lt(feeMinNif)) {
                fee = await this.feeEth();
            }
        }

        let gas = 0;

        try {
            await sleep(sleep_time);
            gas = await this.genesis.methods.newMarket(
                controller,
                marketFee,
                marketSwapFee,
                tier,
                uri).estimateGas({
                from:this.account,
                value: ""+fee
            });
        }catch(e){
            console.log('Error at gas estimation: ', e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        this.genesis.methods.newMarket(
            controller,
            marketFee,
            marketSwapFee,
            tier,
            uri)
            .send({
                from:this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 ),
                value: ""+fee
            })
            .on('error', async function(e){
                console.log(e);
                errCallback('');
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                postCallback(receipt);
            });
    };

    this.feeEth = async function(){
        await sleep(sleep_time);
        return await this.genesis.methods.marketFee().call({from:this.account});
    };

    this.getMinimumNif = async function(){
        await sleep(sleep_time);
        return await this.genesis.methods.marketFeeMinimumNif().call({from:this.account});
    };

    this.iHaveAnyWildcard = async function(){
        await sleep(sleep_time);
        return await this.genesis.methods.iHaveAnyWildcard().call({from:this.account});
    };

    this.saleExists = async function(account, index, marketAddress){
        await sleep(sleep_time);
        let market = _self.contractInstancesCache(marketAddress, 'market');
        return await market.methods.saleExists(account, index).call({from:this.account});
    };

    this.getSwapRequestsLength = async function(account, swapAddress){

        await sleep(sleep_time);
        let swap = _self.contractInstancesCache(swapAddress, 'swap');
        return await swap.methods.getSwapRequestsLength(account).call({from:this.account});
    };

    this.getSwapRequestsListLength = async function(account, swapAddress){

        await sleep(sleep_time);
        let swap = _self.contractInstancesCache(swapAddress, 'swap');
        return await swap.methods.getSwapRequestsListLength(account).call({from:this.account});
    };

    this.getSwapRequest = async function(account, index, swapAddress){

        await sleep(sleep_time);
        let swap = _self.contractInstancesCache(swapAddress, 'swap');
        return await swap.methods.getSwapRequest(account, index).call({from:this.account});
    };

    this.getSwapRequestListEntry = async function(account, index, swapAddress){

        await sleep(sleep_time);
        let swap = _self.contractInstancesCache(swapAddress, 'swap');
        return await swap.methods.getSwapRequestListEntry(account, index).call({from:this.account});
    };

    this.getSwapExists = async function(seller0, seller1, index0, swapAddress){

        await sleep(sleep_time);
        let _index0 = parseInt(index0);
        let swap = _self.contractInstancesCache(swapAddress, 'swap');
        return await swap.methods.swapStakers( seller0, seller1, '0x'+web3.utils.padLeft(_index0.toString(16), 64) ).call({from:this.account});
    };

    this.getAsksLengths = async function(account, marketAddress){

        if(account == ''){
            account = '0x0000000000000000000000000000000000000000';
        }

        await sleep(sleep_time);
        let market = _self.contractInstancesCache(marketAddress, 'market');
        return await market.methods.getAsksLengths(account).call({from:this.account});
    };

    this.getAsk = async function(index, account, marketAddress){

        await sleep(sleep_time);

        let askIndex = 0;

        let market = _self.contractInstancesCache(marketAddress, 'market');

        if(account != ''){

            askIndex = await market.methods.userAsks(account, index).call({from:this.account});
        }
        else
        {
            askIndex = await market.methods.publicAsks(index).call({from:this.account});
        }

        if(askIndex != 0) {

            return {ask: await this.getAskBase(askIndex), index: askIndex};
        }

        return null;
    };

    this.getCategoriesLength = async function(category, wrapAddress){

        await sleep(sleep_time);

        let wrap = _self.contractInstancesCache(wrapAddress, 'wrap');
        return await wrap.methods.getCategoriesLength(category).call({from: this.account});
    }

    this.getCategory = async function(category, index, wrapAddress){

        await sleep(sleep_time);

        let _cat = parseInt(category);
        let wrap = _self.contractInstancesCache(wrapAddress, 'wrap');
        return await wrap.methods.categories( '0x'+web3.utils.padLeft(_cat.toString(16), 64), index ).call({from: this.account});
    }

    this.getAskBase = async function(askIndex, marketAddress){

        await sleep(sleep_time);

        let market = _self.contractInstancesCache(marketAddress, 'market');
        return await market.methods.getAsk(askIndex).call({from: this.account});
    }

    this.getFunds = async function(owner, token, marketAddress){

        await sleep(sleep_time);

        let market = _self.contractInstancesCache(marketAddress, 'market');
        return await market.methods.funds(owner, token).call({from: this.account});
    }

    this.getRoyalties = async function(erc1155Address, id, marketAddress){

        await sleep(sleep_time);

        let _id = parseInt(id);
        let market = _self.contractInstancesCache(marketAddress, 'market');
        return await market.methods.royalties( erc1155Address, '0x'+web3.utils.padLeft(_id.toString(16), 64) ).call({from: this.account});
    }

    this.sell = async function(erc1155Address, id, amount, token, collectionPrice, swapMode, category, wrapAddress, preCallback, postCallback, errCallback){

        await sleep(sleep_time);

        let gas = 0;

        let setup = [collectionPrice, swapMode, category];

        let wrap = _self.contractInstancesCache(wrapAddress, 'wrap');

        try{

            gas = await wrap.methods.sell(erc1155Address, id, amount, token, setup).estimateGas({
                from:this.account,
            });

        }catch(e){
            console.log(e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        wrap.methods.sell(erc1155Address, id, amount, token, setup)
            .send({
                from:this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 )
            })
            .on('error', async function(e){
                errCallback();
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                console.log("Sell order placed.");
                postCallback(receipt);
            });
    };

    this.setRoyalties = async function(erc1155Address, id, royaltyPercent, marketAddress, preCallback, postCallback, errCallback){

        await sleep(sleep_time);

        let gas = 0;

        let market = _self.contractInstancesCache(marketAddress, 'market');

        try{

            gas = await market.methods.setRoyalty(erc1155Address, id, royaltyPercent).estimateGas({
                from:this.account,
            });

        }catch(e){
            console.log(e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        market.methods.setRoyalty(erc1155Address, id, royaltyPercent)
            .send({
                from:this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 )
            })
            .on('error', async function(e){
                errCallback();
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                postCallback(receipt);
            });
    };

    this.buy = async function(seller, amount, ref, index, marketAddress, preCallback, postCallback, errCallback){

        await sleep(sleep_time);

        let market = _self.contractInstancesCache(marketAddress, 'market');

        let gas = 0;

        try{

            gas = await market.methods.buy(seller, ""+amount, ref, ""+index).estimateGas({
                from: this.account
            });

        }catch(e){
            console.log(e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        market.methods.buy(seller, ""+amount, ref, ""+index)
            .send({
                from: this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 )
            })
            .on('error', async function(e){
                errCallback();
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                console.log("Buy order placed.");
                postCallback(receipt);
            });
    };

    this.cancel = async function(index, wrapAddress, preCallback, postCallback, errCallback){

        await sleep(sleep_time);

        let wrap = _self.contractInstancesCache(wrapAddress, 'wrap');

        let gas = 0;

        try{

            gas = await wrap.methods.cancelAsk(""+index).estimateGas({
                from: this.account
            });

        }catch(e){
            console.log(e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        wrap.methods.cancelAsk(""+index)
            .send({
                from: this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 )
            })
            .on('error', async function(e){
                errCallback();
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                postCallback(receipt);
            });
    };

    this.withdrawFunds = async function(token, marketAddress, preCallback, postCallback, errCallback){

        await sleep(sleep_time);

        let market = _self.contractInstancesCache(marketAddress, 'market');

        let gas = 0;

        try{

            gas = await market.methods.withdrawBalance(token).estimateGas({
                from: this.account
            });

        }catch(e){
            console.log(e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        market.methods.withdrawBalance(token)
            .send({
                from: this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 )
            })
            .on('error', async function(e){
                errCallback();
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                postCallback(receipt);
            });
    };

    this.requestSwap = async function(index0, index1, nif, swapAddress, preCallback, postCallback, errCallback){

        await sleep(sleep_time);

        let swap = _self.contractInstancesCache(swapAddress, 'swap');

        let gas = 0;

        try{

            gas = await swap.methods.requestSwap(index0, index1, nif).estimateGas({
                from: this.account
            });

        }catch(e){
            console.log(e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        swap.methods.requestSwap(index0, index1, nif)
            .send({
                from: this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 )
            })
            .on('error', async function(e){
                errCallback();
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                postCallback(receipt);
            });
    };

    this.acceptSwap = async function(swapIndex, swapAddress, preCallback, postCallback, errCallback){

        await sleep(sleep_time);

        let swap = _self.contractInstancesCache(swapAddress, 'swap');

        let gas = 0;

        try{

            gas = await swap.methods.acceptSwap(swapIndex).estimateGas({
                from: this.account
            });

        }catch(e){
            console.log(e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        swap.methods.acceptSwap(swapIndex)
            .send({
                from: this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 )
            })
            .on('error', async function(e){
                errCallback();
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                postCallback(receipt);
            });
    };

    this.cancelSwapRequest = async function(seller, swapIndex, swapAddress, preCallback, postCallback, errCallback){

        await sleep(sleep_time);

        let swap = _self.contractInstancesCache(swapAddress, 'swap');

        let gas = 0;

        try{

            gas = await swap.methods.cancelSwapRequest(seller, swapIndex).estimateGas({
                from: this.account
            });

        }catch(e){
            console.log(e);
            errCallback("");
            return;
        }

        const price = await web3.eth.getGasPrice();

        swap.methods.cancelSwapRequest(seller, swapIndex)
            .send({
                from: this.account,
                gas: gas + Math.floor( gas * 0.1 ),
                gasPrice: Number(price) + Math.floor( Number(price) * 0.1 )
            })
            .on('error', async function(e){
                errCallback();
            })
            .on('transactionHash', async function(transactionHash){
                preCallback();
            })
            .on("receipt", function (receipt) {
                postCallback(receipt);
            });
    };

}