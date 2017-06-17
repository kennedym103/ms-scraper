var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
const super = require('superagent');

app.get('/', function(req, res) {

    url = 'http://magicseaweed.com/site-map.php';

    request(url, function(error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);
            var location, href;

            var json = {};

            let max = 3;
            $('h1').each(function(i, elm) {
                if (i > max ) return;

                const h1 = $(this);
                const country = h1.text().toLowerCase().split(' surf reports').shift();
                json[country] = [];

                $(this).next('table').find('a').each(function(j, elm) {
                    if (j > max) return;
                    var data = $(this);
                    location = data.text();
                    href = data.attr('href');

                    json[country].push({
                        href,
                        location,
                    }) 
                })
            });
            console.log(json)

            for (const country in json) {
                console.log(json[country])
                    request.get({
                        dataType: 'json',
                        url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + country + '+' + location + '&key=AIzaSyA8h8aBzWuczSuC4s-oa7aM7Al4LyIS2eA',
                        success: success
                    });

                    function success(data) {
                        const lat = results.geometry.location.lat;
                        const lng = results.geometry.location.lng;
                        console.log(json[country])
                        json[country].push({
                            lat,
                            lng,
                        });
                    }
                }
           
            fs.writeFile('output.json', JSON.stringify(json, null, 4), function(err) {})
        }
 
        // To write to the system we will use the built in 'fs' library.
        // In this example we will pass 3 parameters to the writeFile function
        // Parameter 1 :  output.json - this is what the created filename will be called
        // Parameter 2 :  JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
        // Parameter 3 :  callback function - a callback function to let us know the status of our function

        // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.

    });
})

app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;
