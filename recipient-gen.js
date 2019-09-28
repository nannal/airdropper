var steem = require("steem")
var fs = require('fs')
var logger = fs.createWriteStream('airdrop.csv', {
  flags: 'a' // 'a' means appending (old data will be preserved)
})
const { Parser } = require('json2csv');
const fields = ['author', 'permlink', 'created', 'children', 'total_payout_value', 'curator_payout_value', 'pending_payout_value', 'nbVotes'];
const opts = { fields };
const parser = new Parser(opts)

var avalonUsers=[]
var recipients = {}
const query = {
  tag: process.env.TAG,
  limit: 100
}

fs.readFile('avaloners26092019.csv', function(err, buf) {
  avalonUsers = buf.toString().split('\n')
  console.log('Loaded '+avalonUsers.length+' avalon users from file')
  getStuff()
});

function getStuff(author, permlink) {
  query.start_author = author
  query.start_permlink = permlink
  steem.api.getDiscussionsByCreated(query, function(err, result) {
    try {
      console.log(result[0].created, Object.keys(recipients).length)
      for(i=0; i<result.length;i++) {
        var thune = parseFloat(result[i].total_payout_value.replace(' SBD', ''))
        thune += parseFloat(result[i].curator_payout_value.replace(' SBD', ''))
        thune += parseFloat(result[i].pending_payout_value.replace(' SBD', ''))
        winPoints(result[i].author, thune, 'author')
        var total_rshares = 0
        for (let y = 0; y < result[i].active_votes.length; y++) {
          total_rshares += parseInt(result[i].active_votes[y].rshares)
        }
        for (let y = 0; y < result[i].active_votes.length; y++) {
          winPoints(result[i].active_votes[y].voter, thune*parseInt(result[i].active_votes[y].rshares)/total_rshares, 'curation')
        }
      }
      if (result.length < 100) {
        fin()
      } else {
        getStuff(result[result.length-1].author, result[result.length-1].permlink)
      }
    } catch(err) {
      setTimeout(function() {
        getStuff(
          query.start_author,
          query.start_permlink
        )
      }, 3000)
      console.log(err)
    }
  });
}

function winPoints(author, amount, type) {
  if (amount <= 0) return
  if (isNaN(amount)) return

  if (avalonUsers.indexOf(author) != -1) {
    if (!recipients[author])
      recipients[author] = {
        curation: 0,
        author: 0
      }
    //console.log(author+' '+type+' '+amount)
    recipients[author][type] += amount
  }
}

function fin() {
  for (const name in recipients) {
    logger.write(name+','+recipients[name].curation+','+recipients[name].author+'\n')
  }
  console.log('Wrote output file')
}

process.on('SIGINT', function() {
  fin()
  setTimeout(function() {
    process.exit(0)
  }, 1000)
})