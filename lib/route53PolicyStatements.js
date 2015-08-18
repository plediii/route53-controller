"use strict";

module.exports = function (params) {
    return [
        {
            "Effect": "Allow",
            "Action": [
                "route53:ChangeResourceRecordSets"
            ]
        }
    ];
};
