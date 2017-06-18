var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
const superagent = require('superagent');

app.get('/', function(req, res) {

            url = 'http://magicseaweed.com/site-map.php';

            request(url, function(error, response, html) {
                if (!error) {
                    var $ = cheerio.load(html);
                    var location, href;

                    var json = {};

                    let max = 3;
                    $('h1').each(function(i, elm) {
                        if (i > max) return;

                        const h1 = $(this);
                        const country = h1.text().toLowerCase().split(' surf reports').shift();
                        json[country] = [];

                        $(this).next('table').find('a').each(function(j, elm) {
                            if (j > max) return;
                            var data = $(this);
                            location = data.text();
                            href = data.attr('href');
                            spotId = href.split('/')[2];
                            console.log('the spot id is ' + spotId);

                            json[country].push({
                                href,
                                location,
                                spotId,
                            })
                        })
                    });
                    console.log(json)

                    let i = 0;
                    for (const country in json) {
                        console.log(country)
                        
                        let j = 0;
                        if (json[country].length === 0) ++i;
                        for(const locationObj in json[country]) {
                            console.log('----------------------------------');
                            console.log(`LOOKING UP DATA for ${country}, ${json[country][locationObj].location}`)
                                
                            setTimeout(() => {
                                superagent
                                   .get('https://maps.googleapis.com/maps/api/geocode/json?address=' + country + ' + ' + json[country][locationObj].location + '&key=AIzaSyAEdRZoaF7sEQqOcvTP0gcUeF9DA-HZHos')
                                   .set('Accept', 'application/json')
                                   .end(function(err, res){
                                     if (err || !res.ok) {
                                       alert('Oh no! error');
                                     } else {
                                        res = res.body;
                                        if (res.status !== 'ZERO_RESULTS') {
                                            console.log(`FOUND DATA for ${country}, ${json[country][locationObj].location}`)
                                            console.log('----------------------------------');
                                            const lat = res.results[0].geometry.location.lat;
                                            const lng = res.results[0].geometry.location.lng;
                                            json[country][locationObj].lat = lat;
                                            json[country][locationObj].lng = lng;
                    
                                        }
                                        else {
                                            console.log(`DID NOT FIND DATA for ${country}, ${json[country][locationObj].location}`)
                                            console.log('----------------------------------');
                                        }


                                        
                                        j++;
                                        console.log(`country is ${country} i is ${i} location is ${locationObj.location} j is ${j}`)
                                        if (j === json[country].length) {
                                            i++;
                                        }
                                        if (j === json[country].length && i === Object.keys(json).length) {
                                            console.log('yeah its getting here', i, j, json);
                                        // if ( i === country.length ) {
                                            fs.writeFile('output.json', JSON.stringify(json, null, 4), function(err) {})
                                        }
                                    }
                                }); 
                            }, 1000);
                        }    
                    }

                        // To write to the system we will use the built in 'fs' library.
                        // In this example we will pass 3 parameters to the writeFile function
                        // Parameter 1 :  output.json - this is what the created filename will be called
                        // Parameter 2 :  JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
                        // Parameter 3 :  callback function - a callback function to let us know the status of our function

                        // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.

                    }
            })
})

app.listen('8081');
console.log('Magic happens on port 8081');
module.exports = app;

            
