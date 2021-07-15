var fs = require('fs');
var https = require('https');
var events = require('events');
var eventEmitter = new events.EventEmitter();

var bugs = JSON.parse(fs.readFileSync('data/bugs.json', 'utf8'));
var frs = JSON.parse(fs.readFileSync('data/feature-requests.json', 'utf8'));

// Eample structure:
// { "reported" : { 
// 	"with_ids" : {"id" : ['name1', 'name2']},
// 	"names_only": ["name1", "name2"]
//   },
//   "assigned" : { ... }
// }
names = {}

find_names_by_role = function (tickets, role) {
	role_id_field = role + "_id";
	role_field = role;
	names[role] = {"with_ids":{}, "names_only":[]}
	tickets.forEach(function(ticket){
		name_id = ticket[role_id_field];
		name = ticket[role_field];
		pers = names[role]["with_ids"][name_id]
		if (pers != null) {
			if (pers.indexOf(name) == -1) {
				pers.push(name);
			}
		}
		else {
			names[role]["with_ids"][name_id] = [ticket[role_field]];	
		}
    // Add to names only list
    if (names[role]["names_only"].indexOf(name) == -1) {
      names[role]["names_only"].push(name);
    }
	});
}

function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

// Reporters
find_names_by_role(bugs["tickets"], "reported_by");
find_names_by_role(frs["tickets"], "reported_by");

// Assignees
find_names_by_role(bugs["tickets"], "assigned_to");
find_names_by_role(frs["tickets"], "assigned_to");

fs.writeFile("data/tei-names.json", JSON.stringify(names, null, 2));

// Merged list of names
all_names = {}
roles = Object.keys(names)
roles.forEach(function(role, r_i) {
  names[role]["names_only"].forEach(function(n, n_i){
    if (n in all_names == false) {
      
      // Check with GitHub if the user exists

      var options = {
          host: 'github.com',
          path: '/' + n,
          method: 'GET',
          headers: {'user-agent': 'node.js'}
      };

      https.get(options, function(res){
        res.on('data', function(){});
        res.on('end', function(){
          if (res.statusCode == 200) {
            all_names[n] = n;
          }
          else { 
            all_names[n] = "sf_user_"+n; 
          }

          if (n_i+1 == names[role]["names_only"].length && r_i+1 == roles.length) {
            eventEmitter.emit("doneGH");
          }
        });
      }).end();
    }
 });
});

eventEmitter.on('doneGH', function() {
  console.log('done');
  fs.writeFile("data/tei-sf-users.json", JSON.stringify(all_names, null, 2));
});