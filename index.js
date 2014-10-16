var s3 = require('s3'),
    http = require('http'),
    csv = require('csv'),
    _ = require('underscore');


var url = "http://fldoselectionfiles.elections.myflorida.com/enightfilespublic/20141104_ElecResultsFL.xls",
    creds = {
        aws_id: process.env.AWS_ID,
        aws_secret: process.env.AWS_SECRET
    };

var fetchFile = function(url, callback) {
	http.get(url, function(response) {
	    var chunks = [];
	    response
	        .on("data", function(chunk) { chunks.push(chunk); })
	        .on("end", function() {
	          callback(null, chunks.join(""))
	        })
	        .setEncoding("utf8");
	}).on("error", callback);
}

var processData = function(err, data) {
	csv.parse(data, { columns: true, delimiter: '\t', quote: "~", escape: "~"}, function(err, results) {
		var govData = _(results).filter(function(i) { return i['RaceName'] === "Governor and Lieutenant Governor" }),
			groups = _(govData).groupBy('CanNameLast'),
			sumVotes = function(memo, votes) { return memo + votes },
			cristVotes = _.reduce(_.map(parseInt, _.pluck(groups['Crist'], 'CanVotes')),  sumVotes),
			scottVotes = _.reduce(_.map(parseInt, _.pluck(groups['Scott'], 'CanVotes')), sumVotes );

			console.log('Crist', cristVotes);
			console.log('Scott', scottVotes)

	});
}

fetchFile(url, processData)
