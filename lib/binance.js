'use strict';
const log = require('./log');
const Events = require('events');
const request = require('./request');
const { host, task_interval } = require('../config');

module.exports = class Binance extends Events {

    constructor() {
        super();
        this.size = 30;
        this.break_symbols = [];
        this.init();
    }

    async init() {
        try {
            console.log('init binance');
            await this.load_symbols();
            await this.load_symbols_kline();
        }
        catch (err) {
            this.init();
        }
    }

    async load_symbols() {
        // this.symbols = ['BTC', 'BCC'];

        const symbols = new Set();
        const info = await request.send({ host: host, path: '/api/v1/exchangeInfo' });
        info.symbols.forEach((symbol) => symbols.add(symbol.baseAsset));
        symbols.delete('123');
        this.symbols = [...symbols].sort((a, b) => {
            if (a > b) return 1;
            else return - 1;
        });
    }

    async fetch_btc_in_usdt() {
        const ret = await request.send({
            host: host
            , path: '/api/v1/klines'
            , qs: {
                interval: '1m'
                , limit: this.size
                , symbol: 'BTCUSDT'
            }
        });

        return ret.map((datum) => + datum[4]);
    }

    async fetch_eth_in_usdt() {
        const ret = await request.send({
            host: host
            , path: '/api/v1/klines'
            , qs: {
                interval: '1m'
                , limit: this.size
                , symbol: 'ETHUSDT'
            }
        });

        return ret.map((datum) => + datum[4]);
    }

    async fetch_bnb_in_usdt() {
        const ret = await request.send({
            host: host
            , path: '/api/v1/klines'
            , qs: {
                interval: '1m'
                , limit: this.size
                , symbol: 'BNBUSDT'
            }
        });

        return ret.map((datum) => + datum[4]);
    }

    async fetch_usdt_in_usdt() {
        return new Array(this.size).fill(1);
    }

    async fetch_ticket_24h_in_btc() {
        const btc_24h = {};

        const ret = await request.send({
            host: host
            , path: '/api/v1/ticker/24hr'
        });

        ret.forEach((item) => {
            if (/BTC$/.test(item.symbol)) {
                btc_24h[item.symbol.substring(0, item.symbol.indexOf('BTC'))] = Math.round(item.quoteVolume);
            }
        });

        return btc_24h;
    }

    async load_symbols_kline() {
        try {
            console.time('task');
            const btc_usdt = await this.fetch_btc_in_usdt();
            const eth_usdt = await this.fetch_eth_in_usdt();
            const bnb_usdt = await this.fetch_bnb_in_usdt();
            const usdt_usdt = await this.fetch_usdt_in_usdt();
            const btc_24h = await this.fetch_ticket_24h_in_btc();

            for (let symbol of this.symbols) {
                try {
                    const statistics_05 = new Array(9).fill(0);
                    const statistics_10 = new Array(9).fill(0);
                    const statistics_15 = new Array(9).fill(0);
                    const statistics_30 = new Array(9).fill(0);

                    const btc_low = new Array(30).fill(0);
                    const btc_close = new Array(30).fill(0);
                    let btc_latest_high = 0;

                    const promises = this.yield_opt(symbol).map((task) => request.send(task));
                    const symbol_results = await Promise.all(promises);

                    symbol_results.forEach((kline_result, index) => {
                        if (Array.isArray(kline_result)) {

                            {
                                /**
                                 * 处理价格
                                 * BTC用USDT，其余用BTC
                                 */

                                if (index === 0) {
                                    statistics_05[7] = + kline_result[29][4];
                                    statistics_10[7] = + kline_result[29][4];
                                    statistics_15[7] = + kline_result[29][4];
                                    statistics_30[7] = + kline_result[29][4];
                                }

                                if (symbol === 'BTC' && index === 3) {
                                    statistics_05[7] = + kline_result[29][4];
                                    statistics_10[7] = + kline_result[29][4];
                                    statistics_15[7] = + kline_result[29][4];
                                    statistics_30[7] = + kline_result[29][4];
                                }
                            }

                            let multipl;
                            let total_05 = 0;
                            let total_10 = 0;
                            let total_15 = 0;
                            let total_30 = 0;

                            if (index === 0) multipl = btc_usdt;
                            else if (index === 1) multipl = eth_usdt;
                            else if (index === 2) multipl = bnb_usdt;
                            else multipl = usdt_usdt;

                            kline_result.forEach((datum, i) => {
                                const sum = Number(datum[4]) * Number(datum[5]) * multipl[index];
                                if (i >= 25) total_05 += sum;
                                if (i >= 20) total_10 += sum;
                                if (i >= 15) total_15 += sum;
                                total_30 += sum;
                                if (index === 0) {
                                    if (i === 29) btc_latest_high = Number(datum[2]);
                                    btc_low[i] = Number(datum[3]);
                                    btc_close[i] = Number(datum[5]);
                                }
                            });

                            let offset;
                            if (index === 0) offset = 1;
                            else if (index === 1) offset = 2;
                            else if (index === 2) offset = 3;
                            else offset = 4;

                            statistics_05[offset] = Number((total_05 / 10000).toFixed(1));
                            statistics_10[offset] = Number((total_10 / 10000).toFixed(1));
                            statistics_15[offset] = Number((total_15 / 10000).toFixed(1));
                            statistics_30[offset] = Number((total_30 / 10000).toFixed(1));
                        }
                    });

                    {
                        statistics_05[0] = symbol;
                        statistics_10[0] = symbol;
                        statistics_15[0] = symbol;
                        statistics_30[0] = symbol;

                        statistics_05[5] = Number((statistics_05[1] + statistics_05[2] + statistics_05[3] + statistics_05[4]).toFixed(1));
                        statistics_10[5] = Number((statistics_10[1] + statistics_10[2] + statistics_10[3] + statistics_10[4]).toFixed(1));
                        statistics_15[5] = Number((statistics_15[1] + statistics_15[2] + statistics_15[3] + statistics_15[4]).toFixed(1));
                        statistics_30[5] = Number((statistics_30[1] + statistics_30[2] + statistics_30[3] + statistics_30[4]).toFixed(1));

                        const ts = Date.now();
                        statistics_05[6] = ts;
                        statistics_10[6] = ts;
                        statistics_15[6] = ts;
                        statistics_30[6] = ts;

                        if (! btc_24h[symbol]) console.log(`24h中没有${symbol}`);
                        else {
                            statistics_05[8] = btc_24h[symbol];
                            statistics_10[8] = btc_24h[symbol];
                            statistics_15[8] = btc_24h[symbol];
                            statistics_30[8] = btc_24h[symbol];
                        }
                    }

                    {
                        console.log(`${new Date().toISOString()} ${statistics_05.join(', ')}`);

                        this.emit('kline', {
                            symbol: symbol
                            , '05': statistics_05
                            , '10': statistics_10
                            , '15': statistics_15
                            , '30': statistics_30
                            , btc_low: btc_low.map((num) => Number(((btc_latest_high - num) / num * 100).toFixed(1)))
                            , btc_close: btc_close
                        });
                    }
                }

                catch (err) {
                    log.info({ lv: 'ERROR', message: err.message, desc: symbol });
                }
            }
        }
        catch (err) {
            log.info({ lv: 'ERROR', message: err.message, desc: 'load_symbols_kline' });
        }

        finally {
            console.timeEnd('task');
            setTimeout(this.load_symbols_kline.bind(this), task_interval);
        }
    }

    yield_opt(symbol) {
        return ['BTC', 'ETH', 'BNB', 'USDT'].map((platform) => {
            return {
                host: host
                , path: '/api/v1/klines'
                , qs: {
                    interval: '1m'
                    , limit: this.size
                    , symbol: `${symbol}${platform}`
                }
            }
        });
    }

    randow_data(seed) {
        return [
            Math.floor(Math.random() * 200)
            , Math.floor(Math.random() * 300)
            , Math.floor(Math.random() * 400)
            , Math.floor(Math.random() * 500)
            , Math.floor(Math.random() * 1000)
            , Date.now()
            , Math.floor(Math.random() * 10)
            , Math.floor(Math.random() * 50)
        ]
    }

    randow_array(length) {
        const arr = new Array(length).fill(0);
        arr.forEach((item, i) => arr[i] = Math.floor(Math.random() * 50));
        return arr;
    }
}