var _ = require("underscore");
var toLowerCase = function(w) { return w.toLowerCase(); };
var stopWords = ["a", "is", "this", "the", "in", "and", "sex", "body", "love", "fuck", "gun"];

Parse.Cloud.beforeSave("Posts", function(request, response) {
    var post = request.object;
    var body = post.get("body");
    if(body) {
      if(post.get("active") == false) {//set the price only if it's not initialized yet
        var pricetag = body.match(/\$\d+/gmi);
        post.set("price", parseInt(pricetag[0].substring(1)));
      };
    };
    response.success();
});


Parse.Cloud.afterSave("Posts", function(request, response) {
    var post = request.object;
    var body = post.get("body");
    if(body) {
    var words = body.split(/\b/);
    words = _.map(words, toLowerCase);

    words = _.filter(words, function(w) { return w.match(/^\w+$/) && ! _.contains(stopWords, w); });
 
    var hashtags = body.match(/#.+?\s/g);
    hashtags = _.map(hashtags, toLowerCase)
        .map(function(x){return x.replace(/#/g, '');})
            .map(function(x){return x.replace(/\s/g, '');})
            .filter(function(w) { return stopWords.indexOf(w) <0;});

        // remove duplicate tags
        uniqueArray = hashtags.filter(function(item, pos) {
            return hashtags.indexOf(item) == pos;
        })
        hashtags = uniqueArray



    var HashTag = Parse.Object.extend("HashTags");

    // Parse.Cloud.useMasterKey();

    //first delete all previousy tags associated with this post
    query = new Parse.Query("HashTags");
      query.equalTo("post", post);
      query.find({
        success: function(myhashtags) {
          console.log("found " + myhashtags.length + " hashTag to delete");
          Parse.Object.destroyAll(myhashtags, {
            success: function() {
                // and now intert the new tags
                for(var i in hashtags)
                {
                    console.log("hashtag:" + hashtags[i]);
                    // Create a new instance of that class.
                    var hashTag = new HashTag();
                    hashTag.set("post", post);
                    hashTag.set("hashTag", hashtags[i]);
                    hashTag.save();
                }
                // response.success();
            },
            error: function(error) {
                console.error("Error deleting related HashTags " + error.code + ": " + error.message);
                response.error();
            }
          });
        },
        error: function(error) {
            console.error("Error finding related hashtags " + error.code + ": " + error.message);
            response.error();
        }
      });
} else {
  response.success("no body provided");  
};
});

Parse.Cloud.beforeDelete("Posts", function(request, response) {
    var post = request.object;
    console.log("post id for deletion: "  + post);
    //first delete all previousy tags associated with this post
    query = new Parse.Query("HashTags");
      query.equalTo("post", post);
      query.find({
        success: function(myhashtags) {
          console.log("found " + myhashtags.length + " hashTag to delete");
          Parse.Object.destroyAll(myhashtags, {
            success: function() {                
                console.log("deleted hashtags");
                response.success();
            },
            error: function(error) {
              console.error("Error deleting related HashTags " + error.code + ": " + error.message);
              response.error();
            }
          });
        },
        error: function(error) {
            console.error("Error finding related hashtags " + error.code + ": " + error.message);
            response.error();
        }
      });
});






var stripe = require("stripe");

var Stripe = require('stripe');
Stripe.initialize('sk_test_EVlB1vn2jqIhaCBM9p7C0v9X');


Parse.Cloud.define("purchaseItem", function(request, response) {
    Parse.Cloud.useMasterKey();

  // The Item and Order tables are completely locked down. We 
  // ensure only Cloud Code can get access by using the master key.

 Stripe.Charges.create({
      amount: Math.floor(request.params.price * 100), // express dollars in cents 
      currency: 'usd',
      card: request.params.cardToken
    }).then(function() {
    // And we're done!
    response.success('Success');

  // Any promise that throws an error will propagate to this handler.
  // We use it to return the error from our Cloud Function using the 
  // message we individually crafted based on the failure above.
  }, function(error) {
    response.error(error.message);
  });
});