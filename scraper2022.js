const fs = require('fs');
const request = require('request-promise');
const cheerio = require('cheerio');
const superagent = require('superagent');

// CONFIGS
const url = 'http://magicseaweed.com/site-map.php';

// HELPER METHODS
const requestAsPromise = (url) => {
    return new Promise((resolve, reject) => {
        request(url, (err, resp, html) => {
            if (err) {
                reject(err);
                return;
            }

            resolve({ resp, html })
        });
    });
} // promise request

const timeoutPromise = (timeout, ...args) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(...args);
        }, timeout);
    });
} // promise timeout

const superGET = (url, query = null) => {
    return new Promise((resolve, reject) => {
        const callback = (err, res, html) => {

            if (err) return console.error(err);

            var $ = cheerio.load(html, { xmlMode: true });
            if ($("script:contains('requirejs.config')")) {
                const lastScript = $("script:contains('requirejs.config')")[0].children[0].data;
                const scriptSplit = lastScript.split("'js/config':")[1];
                const scritSplitBefore = scriptSplit.split(",'js/i18n'")[0];
                const jsonFromScript = JSON.parse(JSON.stringify(scritSplitBefore));

                const parsed = JSON.parse(jsonFromScript);

                return parsed;
            }



        };
        let superobj = request(url, callback);
        if (query && typeof query === 'object') {
            superobj = superobj.query(query);
        }

       

        superobj.end((err, res) => {
            if (err || !res.ok) reject(err);
            if (res && res.body) resolve(res.body);
            else {
                console.log(`@@@@@@@@ FAILED @@@@@@@@`, query);
                reject(res);
            }
        })
    });
}// promise superagent

const populateCountry = ($, callback, max = 50) => {
    const h1 = Array.from($('h1'));
    return h1.reduce((_obj, currentH1, index) => {
        if (index > max) return _obj;
        currentH1 = $(currentH1)
        const country = currentH1
            .text()
            .toLowerCase()
            .split(' surf reports')
            .shift();

        const dataSource = currentH1.next('table').find('a');
        const townsArray = callback($, country, dataSource);
        if (townsArray.length > 0) {
            _obj[country] = townsArray;
        }

        return _obj;
    }, {});
}


const populateTownsByCountry = ($, country, els, max = 50) => {
    return Array.from(els).reduce((_arr, currCountry, index) => {
        if (index > max) return _arr;

        const data = $(currCountry);
        const town = data.text();
        const href = data.attr('href');
        const spotId = href.split('/')[2];

        _arr.push({
            href,
            town,
            spotId,
        });

        return _arr;
    }, []);
}

function delay(t) {
    console.log(t)
    return new Promise(resolve => {
        setTimeout(resolve, t);
    });
}


const convertToPromises = (jsonData) => {
    return Object.keys(jsonData).reduce((promise, country, index) => {
        
           
        
            return jsonData[country].reduce(async(promise2, town, index) => {
                (index % 2 === 1 ) ? await delay(1000) : 
                console.log(`--------------- REQUESTING ${country}, ${town}, ${town.href} ---------------`);
                return promise2.then(data => request(`https://magicseaweed.com${town.href}`).then(res => {
                    if (res.status === 'ZERO_RESULTS') {
                        console.log(`######### FAILED ${country}, ${town} #########`);
                        return data;
                    }


                    var $ = cheerio.load(res, { xmlMode: true });
                    if ($("script:contains('requirejs.config')")) {
                        const lastScript = $("script:contains('requirejs.config')")[0].children[0].data;
                        const scriptSplit = lastScript.split("'js/config':")[1];
                        const scritSplitBefore = scriptSplit.split(",'js/i18n'")[0];
                        const jsonFromScript = JSON.parse(JSON.stringify(scritSplitBefore));

                        const parsed = JSON.parse(jsonFromScript);
                        console.log(`--------------- FOUND ${country}, ${town.town} --------------- SCRAPING FUNCTION RESULT`);
                        data[country][index].lat = parsed.spot.lat;
                        data[country][index].lng = parsed.spot.lon;
                        data[country][index].timeZone = parsed.spot.timeZone;
                        data[country][index].hasHourlyForecast = parsed.spot.hasHourly;
                        data[country][index].isBigWave = parsed.spot.isBigWave;
                    }

                    return data;

                }))
            }, Promise.resolve(jsonData));
    }, Promise.resolve(jsonData));
}

// IMPLEMENTATION
requestAsPromise(url).then(({ response, html }) => {
    const $ = cheerio.load(html);
    const json = populateCountry($, populateTownsByCountry, 1e9);
    convertToPromises(json).then(data => fs.writeFile('output.json', JSON.stringify(data, null, 4), (err) => console.log('file written')))
});
