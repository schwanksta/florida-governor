var AWS = require('aws-sdk'),
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


var uploadToS3 = function(data, callback){
	var s3bucket = new AWS.S3({params: {Bucket: 'swamprace.schwanksta.com'}}),
		s3Data = {Key: 'results-latest.json', Body: JSON.stringify(data), ACL: 'public-read'};
		
	s3bucket.putObject(s3Data, function(err, data) {
	    if (err) {
	      console.log("Error uploading data: ", err);
	    } else {
	      console.log("Successfully uploaded data to swamprace.schwanksta.com/results-latest.json");
	    }
  });
}

var processData = function(err, data) {
	csv.parse(data, { columns: true, delimiter: '\t', quote: "~", escape: "~"}, function(err, results) {
		var govData = _(results).filter(function(i) { return i['RaceName'] === "Governor and Lieutenant Governor" }),
			groups = _(govData).groupBy('CanNameLast'),
			sumVotes = function(memo, votes) { return +memo + +votes },
			totalVotes = _(_(results).pluck('CanVotes')).reduce(sumVotes);
		_.each(groups, function(group){ 
			group['vote_total'] = _.reduce(_.pluck(group, 'CanVotes'), sumVotes)
		});
		console.log(totalVotes)
		console.log('Crist', groups['Crist'].vote_total, groups['Crist'].vote_total / totalVotes);
		console.log('Scott', groups['Scott'].vote_total, groups['Scott'].vote_total / totalVotes);
		uploadToS3({
			totalVotes: totalVotes,
			scott: {
				votes: groups['Scott'].vote_total,
				pct: groups['Scott'].vote_total / totalVotes
			},
			crist: {
				votes: groups['Crist'].vote_total,
				pct: groups['Crist'].vote_total / totalVotes
			},
		}, null);
	});
}

fetchFile(url, processData)
