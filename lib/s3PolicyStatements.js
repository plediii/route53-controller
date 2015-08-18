"use strict";

module.exports = function (s3location) {
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
