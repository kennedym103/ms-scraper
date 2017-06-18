const fs = require('fs');
const request = require('request');
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

            resolve({resp, html})
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
        let superobj = superagent.get(url);
        if (query && typeof query === 'object') {
            superobj = superobj.query(query);
        }
        superobj = superobj.set('Accept', 'application/json')
        superobj.end((err, res) => {
            if (err || !res.ok) reject(err);
            if (res && res.body) resolve(res.body);
            else {
                console.log(`@@@@@@@@ FAILED @@@@@@@@`, query);
                reject(res);
            }
        })
    });
} // promise superagent

const populateCountry = ($, callback, max = 3) => {
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


const populateTownsByCountry = ($, country, els, max = 3) => {
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

const convertToPromises = (jsonData) => {
    return Object.keys(jsonData).reduce((promise, country) => {
        return jsonData[country].reduce((promise2, town, index) => {
            console.log(`--------------- REQUESTING ${country}, ${town} ---------------`);
            return promise2.then(data => superGET('https://maps.googleapis.com/maps/api/geocode/json', {
                address: `${country}+${town.town}`,
                key: 'AIzaSyAEdRZoaF7sEQqOcvTP0gcUeF9DA-HZHos'
            }).then(res => {
                if (res.status === 'ZERO_RESULTS') {
                    console.log(`######### FAILED ${country}, ${town} #########`);
                    return data;
                }

                data[country][index].lat = res.results[0].geometry.location.lat;
                data[country][index].lng = res.results[0].geometry.location.lng;

                console.log(`--------------- FOUND ${country}, ${town.town} ---------------`);

                //console.log('HAVE DATA, NOW TIMING OUT...');

                return data;
            }))
        }, Promise.resolve(jsonData));
    }, Promise.resolve(jsonData));
}

// IMPLEMENTATION
requestAsPromise(url).then(({response, html}) => {
    const $ = cheerio.load(html);
    const json = populateCountry($, populateTownsByCountry, 1e9);
    convertToPromises(json).then(data => fs.writeFile('output.json', JSON.stringify(data, null, 4), (err) => console.log('file written')))
});
