'use strict';

const rank = function () {
    const cache = {
        '05': {}
        , '10': {}
        , '15': {}
        , '30': {}
    };
    return {
        fetch: (interval) => cache[interval]
        , increase: (interval, symbol) => cache[interval][symbol] ++
        , decrease: (interval, symbol) => cache[interval][symbol] --
        , del_ranking: (interval, symbol) => delete cache[interval][symbol]
        , get_ranking: (interval, symbol) => cache[interval].hasOwnProperty(symbol) ? cache[interval][symbol] : undefined
        , set_ranking: (interval, symbol, ranking) => cache[interval][symbol] = ranking
    };
}();

const sequence = function () {
    const cache = {
        '05': []
        , '10': []
        , '15': []
        , '30': []
    };
    const bs = (interval, target, h, e) => {
        if (e === - 1) {
            cache[interval].push(target);
            return 0;
        }

        if (target[5] >= cache[interval][h][5]) {
            cache[interval].splice(h, 0, target);
            return h;
        }

        else if (cache[interval][e][5] >= target[5]) {
            cache[interval].splice(e + 1, 0, target);
            return e + 1;
        }

        else {
            const mid = Math.floor((e - h) / 2) + h;

            if (cache[interval][mid][5] === target[5]) {
                cache[interval].splice(mid + 1, 0, target);
                return mid + 1;
            }

            else if (cache[interval][mid][5] > target[5]) {
                return bs(interval, target, mid + 1, e);
            }

            else {
                return bs(interval, target, h, mid - 1);
            }
        }
    }
    return {
        fetch: (interval) => cache[interval]
        , delete: (interval, start) => cache[interval].splice(start, 1)
        , insert: (interval, target) => bs(interval, target, 0, cache[interval].length - 1)
        , fetch_next: (interval, start) => cache[interval].slice(start + 1).map((item) => item[0])
    }
}();

exports.set_cache = (interval, symbol, kline) => {
    const rank_old = rank.get_ranking(interval, symbol);

    if (rank_old !== undefined) {
        sequence.fetch_next(interval, rank_old).forEach((symbol) => rank.decrease(interval, symbol));
        rank.del_ranking(interval, symbol);
        sequence.delete(interval, rank_old);
    }

    const rank_new = sequence.insert(interval, kline);
    rank.set_ranking(interval, symbol, rank_new);

    sequence.fetch_next(interval, rank_new).forEach((symbol) => rank.increase(interval, symbol));
}

exports.get_cache = (interval) => sequence.fetch(interval);