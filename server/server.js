////////SETUP////////
var superAdminEmail = "george.strakhov@gmail.com"; //FB email of the superadmin; only the user with this email will be able to change userRoles for other users.

var localhostFacebook = {
  appId: "469095756470603",
  secret: "5aeb3f5ab91e8e93973c40e9608acfa1"
};

var remoteFacebook = {
  appId: "",
  secret: ""
};

////////INITIALIZE//////////

Accounts.onCreateUser(function(options, user) {
  user.userRole = "user";
  // We still want the default hook's 'profile' behavior.
  if (options.profile)
    user.profile = options.profile;
  if(user.services.facebook.email == superAdminEmail) {
    user.userRole = "superAdmin";
  }
  if(Meteor.users.findOne({displayName: user.profile.name})) {
    user.displayName = user.profile.name+Math.floor(Math.random()*1100);
  } else {
    user.displayName = user.profile.name;
  }
  user.email = user.services.facebook.email;
  return user;
});

////////STARTUP//////////
Meteor.startup(function() {
  if(!Accounts.loginServiceConfiguration.findOne()) { //if we just restarted the app and facebook login is not configured
    if(Meteor.absoluteUrl() == "http://localhost:3000/") {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : localhostFacebook.appId, //this is for localhost
        secret : localhostFacebook.secret //this is for localhost
      });
    } else {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : remoteFacebook.appId, //put appId of the FB app for deployed
        secret : remoteFacebook.secret //put secret of the FB app for deployed 
      });    
    }
    console.log("configured facebook login");
  }
});

////////PUBLISH//////////
Meteor.publish("allUsers", function() {
  return Meteor.users.find({}, {fields: {
    userRole: 1,
    displayName: 1,
    profile: 1,
    email: 1,
  }});
});

Meteor.publish("lists", function() {
  return Lists.find();
});

Meteor.publish("items", function() {
  return Items.find();
});

Meteor.publish("comments", function() {
  return Comments.find();
});

///////METHODS///////////
Meteor.methods({
  'newItemSubmit' : function(listId, itemContent) {
    if(!listId || !itemContent) {
      throw new Meteor.Error(400, 'list or item not passed');
      return;
    }
    var theList = Lists.findOne(listId);
    if(!theList) {
      throw new Meteor.Error(400, 'can\'t find this list');
      return;
    }
    itemContent = itemContent.toString();
    if(itemContent == "") {
      throw new Meteor.Error(400, 'text can\'t be blank');
      return;
    }
    var d = new Date();
    var newItem = Items.insert({
      belongsTo: theList._id,
      content: itemContent,
      rating: 1,
      flags: 0,
      plusOnes: [this.userId],
      minusOnes: [],
      lastEdited: d.getTime(),
      by: this.userId,
      moderators: [this.userId],
      watchers: [this.userId]
    });
    if(newItem)
      return newItem;
    else
      return "sorry an error occured. please try again later";
  },
  'userChangeSettings' : function(name, email) {
    var theUser = Meteor.users.findOne(this.userId);
    //console.log(theUser.displayName);
    if((name == "") || (email == "")) {
      throw new Meteor.Error(400, 'name or email can\'t be empty');
      return;
    }
    if(name == "admin") {
      throw new Meteor.Error(400, 'this name is not allowed');
      return;
    }
    if(Meteor.users.findOne({displayName: name}) && !(name == theUser.displayName)) {
      throw new Meteor.Error(400, 'this name is already taken');
      return;
    }
    if(Meteor.users.findOne({email: email}) && !(email == theUser.email)) {
      throw new Meteor.Error(400, 'this email is already taken');
      return;
    };
    Meteor.users.update(this.userId, {$set: {displayName: name, email: email}});
    return "settings saved";
  },
  'changeUserRole' : function(email, newRole) {
    if(!newRole || !email) {
      throw new Meteor.Error(400, 'no email or role passed');
      return;
    }
    if(!Meteor.users.findOne({email: email})) {
      throw new Meteor.Error(400, 'user with such email not found');
      return;
    }
    if(!this.userId) {
      throw new Meteor.Error(400, 'you are not logged in');
      return;
    }
    var userRole = Meteor.users.findOne(this.userId).userRole;
    //console.log(userRole);
    if(!(userRole == "superAdmin")) {
      throw new Meteor.Error(400, 'you\'re not allowed to do this');
      return;
    }    
    console.log("changing the role of the user "+email+" to "+newRole);
    Meteor.users.update({email: email}, {$set: {userRole: newRole}});
    return "successfully changed the role to "+newRole;
  },
  'addNewList' : function(listName, displayName, description, halfSentence) {
    halfSentence = (halfSentence) ? halfSentence.toString() : false;
    if(!this.userId) {
      throw new Meteor.Error(400, 'you are not logged in');
      return;
    }
    if(!(Meteor.users.findOne(this.userId).userRole == "superAdmin")) {
      throw new Meteor.Error(400, 'you are not allowed to do this');
      return;
    }
    if(!listName || !displayName || (listName == "") || (displayName == "")) {
      throw new Meteor.Error(400, 'please provide a list url and a name to display');
      return;
    }
    if(Lists.findOne({name: listName})) {
      throw new Meteor.Error(400, 'a list with such name (url) already exists');
      return;
    }
    var d = new Date();
    var newListId = Lists.insert({
      name: listName,
      displayName: displayName,
      description: (description)?description:"",
      timestamp: d.getTime(),
      by: this.userId,
      moderators: [this.userId],
      watchers: [this.userId],
      halfSentence: halfSentence
    });
    return "new list "+listName+" successfully created. It's now availbale at "+Meteor.absoluteUrl()+"#/list/"+listName;
  },
  'updateList' : function(oldListName, newListName, newListDisplayName, newListDescription, updatedListHalfSentence) {
    updatedListHalfSentence = (updatedListHalfSentence) ? updatedListHalfSentence.toString() : false;
    if(!oldListName) {
      throw new Meteor.Error(400, 'don\'t know which list to change');
      return;
    }
    if(!(Lists.findOne({name: oldListName.toString()}))) {
      throw new Meteor.Error(400, 'can\'t find this list');
      return;
    }
    if(Lists.findOne({name: newListName})) {
      throw new Meteor.Error(400, 'a list with such a name already exists');
      return;
    }
    if(!(Meteor.users.findOne(this.userId).userRole == "superAdmin")) {
      throw new Meteor.Error(400, 'you\'re not allowed to do this');
      return;
    }
    theList = Lists.findOne({name: oldListName});
    newListName = (newListName) ? newListName.toString() : theList.name;
    newListDisplayName = (newListDisplayName) ? newListDisplayName.toString() : theList.displayName;
    newListDescription = (newListDescription) ? newListDescription.toString() : theList.description;
    var d = new Date();
    Lists.update(theList._id, {$set: {
      timestamp: d.getTime(),
      name: newListName,
      displayName: newListDisplayName,
      description: newListDescription,
      halfSentence: updatedListHalfSentence
    }});
    return "list "+theList.name+" successfully updated";
  },
  'cleanUpDb' : function(which) {
    if(!this.userId) {
      throw new Meteor.Error(400, 'you are not logged in');
      return;
    }
    if(!(Meteor.users.findOne(this.userId).userRole == "superAdmin")) {
      throw new Meteor.Error(400, 'you are not allowed to do this');
      return;
    }
    if(!which || which == "") {
      throw new Meteor.Error(400, 'action is not passed')
      return;
    }
    if(which == "items") {
      Items.remove({});
    } else if (which == "lists") {
      Lists.remove({});
    } else if (which == "comments") {
      Comments.remove({});
    } else if (which == "users") {
      Meteor.users.remove({userRole: "user"});
    } else if (which == "everything") {
      Items.remove({});
      Lists.remove({});
      Comments.remove({});
      Meteor.users.remove({userRole: "role"});
    } else {
      throw new Meteor.Error(400, 'action is not supported');
      return;
    }
    return 'DB is clean';
  },
  'thumbsUpDown' : function(upOrDown, itemId) {
    if(!upOrDown || !itemId) {
      throw new Meteor.Error(400, 'up or down or item not passed');
      return;
    }
    if(!Items.findOne(itemId)) {
      throw new Meteor.Error(400, 'can\'t find this item');
      return;
    }
    if(Items.findOne(itemId).by == this.userId) {
      throw new Meteor.Error(400, 'you can\'t vote for your own item');
      return;
    }
    if(Items.findOne({_id: itemId, minusOnes: this.userId}) || Items.findOne({_id: itemId, plusOnes: this.userId})) {
      throw new Meteor.Error(400, 'you can only vote once');
      return;
    }
    if(upOrDown == "up") {
      Items.update(itemId, {$addToSet: {plusOnes: this.userId}});
      Items.update(itemId, {$inc: {rating: 1}});
    }
    if(upOrDown == "down") {
      Items.update(itemId, {$addToSet: {minusOnes: this.userId}});
      Items.update(itemId, {$inc: {rating: -1}});
    }
    return "ok";
  },
  'addComment' : function(itemId, comment, inResponseTo) {
    if(!this.userId) {
      throw new Meteor.Error(400, 'you\'re not logged in');
      return;
    }
    if(!itemId) {
      throw new Meteor.Error(400, 'itemId not passed');
      return;
    }
    if(!comment) {
      throw new Meteor.Error(400, 'comment can\'t be blank');
      return;
    }
    if(inResponseTo) {
      if(!Comments.findOne(inResponseTo)) {
        throw new Meteor.Error(400, 'you\'re responding to a comment that doesn\'t exist');
        return;
      }
    }
    comment = comment.toString();
    var theItem = Items.findOne(itemId);
    if(!theItem) {
      throw new Meteor.Error(400, 'no such item, sorry');
      return;
    }
    var d = new Date();
    var newComment = Comments.insert({
      content: comment,
      belongsTo: theItem._id,
      inResponseTo: inResponseTo,
      by: this.userId,
      plusOnes: [this.userId],
      minusOnes: [],
      rating: 1,
      timeStamp: d.getTime()
    });
    if(newComment) {
      return 'comment added';
    } else {
      throw new Meteor.Error(500, 'sorry, something went wrong');
      return;
    }
      
  },
  'changeComment' : function(commentId, doWhat) {
    if(!commentId || !doWhat) {
      throw new Meteor.Error(400, 'commentId or required action not passed');
      return;
    }
    var comment = Comments.findOne(commentId);
    if(!comment) {
      throw new Meteor.Error(400, 'this comment doesn\'t exist');
      return;
    }
    if(Comments.findOne(comment._id).by == this.userId) {
      throw new Meteor.Error(400, 'you can\'t vote for your own comment');
      return;
    }
    if(Comments.findOne({_id: comment._id, minusOnes: this.userId}) || Comments.findOne({_id: comment._id, plusOnes: this.userId})) {
      throw new Meteor.Error(400, 'you can only vote once');
      return;
    }
    if (doWhat == "up") {
      var inc = 1;
      Comments.update(comment._id, {
        $addToSet: {plusOnes: this.userId}
      });
    } else if (doWhat == "down") {
      var inc = -1;
      Comments.update(comment._id, {
        $addToSet: {minusOnes: this.userId}
      });
    } else {
      throw new Meteor.Error(400, 'action not supported');
      return;
    }
    if((doWhat == "up") || (doWhat == "down")) {
      Comments.update(comment._id, {
        $inc: {rating: inc}
      });
    }
    return 'ok';
  },
});
