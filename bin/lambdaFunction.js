"use strict";

var Promise = require('bluebird');
var fs = require('fs');
var zipDeployment = require('../lib/zipDeployment');

var createFunction = function (AWS, params) {
    return new Promise(function (resolve, reject) {
        return new AWS.Lambda().createFunction(params, function (err, data) {
            if (err) {
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
};

var run = module.exports =  Promise.method(function (aws, zip, args) {
    var argv = require('minimist')(args);
    if (argv._.length === 0) {
        if (argv._.length !== 1) {
            console.error([
                '',
                'Update a lambda deployment.',
                '',
                'Usage: lambdaFunction action [options]',
                '',
                '',
                '',
                'Arguments:',
                ' action                              Either "create" or "update" a lambda function.',
                '',
                'Options: ',
                ' --s3location s3location.json        Include the s3 location file from the this path.',
                ' --resource resource.json            Include the resource.json from this path.',
                ' --role roleARN                      The lambda function role ARN (required to create).',
                ''
            ].join('\n'));
            throw new Error('output location required.');
        }
    }

    var action = argv._[0];
    if (action === 'create') {
        var roleARN = argv.role;
        var resource = argv.resource;
        var functionName = 'r';
        if (!roleARN) {
            throw new Error('--role ARN is required to create a new lambda function.');
        }
        if (!resource) {
            throw new Error('--resource is required to create a new lambda function.');
        }
        return zipDeployment(zip, {
            resource: resource && JSON.parse(fs.readFileSync(resource))
        })
        .then(function () {
            return createFunction({
                Code: {  ZipFile: zip.generate({ type: 'nodebuffer' }) }
                , FunctionName: functionName
                , Handler: 'lambda-index.handler'
                , Role: roleARN
                , Description: 'route53-controller Lambda function'
                , Runtime: 'nodejs'
                , Timeout: 10
            });
        });
    } else {
        throw new Error('Unrecongized action: ' + action);
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
