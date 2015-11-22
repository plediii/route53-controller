"use strict";

var Promise = require('bluebird');

var run = module.exports =  Promise.method(function (aws, zip, args) {
    var argv = require('minimist')(args);
    if (argv._.length === 0) {
        if (argv._.length !== 1) {
            console.error([
                '',
                'Update a lambda deployment.',
                '',
                'Usage: lambdaFunction method',
                '',
                '',
                '',
                'Arguments:',
                ' method                              Either "create" or "update" a lambda function.',
                '',
                'Options: ',
                ' --s3location s3location.json        Include the s3 location file from the this path.',
                ' --resource resource.json            Include the resource.json from this path.',
                ''
            ].join('\n'));
            throw new Error('output location required.');
        }
    }
});

if (!module.parent) {
    run(require('../lib/aws'), require('jszip')(), process.argv.slice(2))
    .then(function (out) {
        console.log('Created ', out);
    })
    .catch(function (err) {
        console.error('Error: ', err, err.stack);
    });
}
