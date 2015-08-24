"use strict";

module.exports = function (params) {
    if (!params.hasOwnProperty('HostedZone')) {
        throw new Error('HostedZone required for route53PolicyStatements');
    }
    return [
        {
            "Effect": "Allow",
            "Action": [
                "route53:ChangeResourceRecordSets"
            ],
            "Resource": [ 'arn:aws:route53:::hostedzone/' + params.HostedZone ]
        }
    ];
};
