"use strict";

module.exports = function (s3location) {
    if (!s3location.hasOwnProperty('Bucket')) {
        throw new Error('Bucket required for s3PolicyStatements');
    }
    if (!s3location.hasOwnProperty('Key')) {
        throw new Error('Key required for s3PolicyStatements');
    }
    return [
        {
            "Effect": "Allow",
            "Action": [
                "s3:Get*"
            ],
            "Resource": [
                "arn:aws:s3:::" + s3location.Bucket + '/' + s3location.Key
            ]
        }
    ];
};
