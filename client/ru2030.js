///////SETUP//////

//pines notify
var interval = false;
Session.set("loaded", false);
Session.set("currentItem", false);
Session.set("sortBy", "popular");
$.pnotify.defaults.history = false;
consume_alert(); //to override normal alert behavior

//////////SITE-WIDE HELPER FUNCTIONS/////////

function consume_alert() { //to override normal alert behavior
    if (_alert) return;
    var _alert = window.alert;
    window.alert = function(message) {
        $.pnotify({
            text: message
        });
    };
};

function notifyCallRes(error, result) {
  if(error)
    notify('error', error.reason);
  if(result)
    notify('success', result);
};

function notify(type, message) {
  $.pnotify({
    text: message,
    type: type
  });
};

function loading(doWhat) {
  if(doWhat == "show")
    $("#loading").show();
  if(doWhat == "hide")
    $("#loading").hide();
};

function loadListByName(listName, itemId) {
  var loadingCounter = 0;
  itemId = (itemId) ? itemId : false;
  interval = Meteor.setInterval(function() {
    if(Lists) {
      var theList = Lists.findOne({name: listName});
      if(theList) {
        Meteor.clearInterval(interval);
        Session.set("currentList", theList);
        Session.set("currentView", "list");
        if(itemId) {
          var theItem = Items.findOne(itemId);
          if(theItem) {
            Session.set("currentItem", theItem);
            Session.set("currentView", "item");
          } else {
            Session.set("currentItem", false);
          }
        } else {
          Session.set("currentItem", false);
        }
        Session.set("loaded", true);
        console.log("loaded");
        loading('hide');
      } else {
        Session.set("loaded", false);
        loadingCounter++;
        if(loadingCounter>10) { //if we can't find the list with such name within 5 seconds
          Meteor.clearInterval(interval);
          loading('hide');
          console.log("didn't manage to load the list");
          Session.set("currentView", "404");
        }
      }
    }
  }, 500);
}

///////SUBSCRIBE///////////

Meteor.subscribe("allUsers");
Meteor.subscribe("lists");
Meteor.subscribe("items");
Meteor.subscribe("comments");

////////////REACTIVE AUTOSUBSCRIBE HELPERS//////////
Meteor.autosubscribe(function() {
  Meteor.subscribe("sortedBy", Session.get("sortBy"));
  Meteor.flush();
});

///////////SITE-WIDE HANDLEBARS HELPERS//////////
Handlebars.registerHelper("userRole", function(which) {
  if(Meteor.user())
    return Meteor.user().userRole == which;
});

Handlebars.registerHelper("currentView", function(which) {
  return Session.get("currentView") == which;
});

Handlebars.registerHelper("currentList", function() {
  return Lists.findOne(Session.get("currentList")._id);
});

Handlebars.registerHelper("currentItem", function() {
  return Items.findOne(Session.get("currentItem")._id);
});

Handlebars.registerHelper("sortByPopularStyle", function() {
  if(Session.get("sortBy") == "popular")
    return "active";
});

Handlebars.registerHelper("sortByLatestStyle", function() {
  if(Session.get("sortBy") == "latest")
    return "active";
});

//////////TEMPLATE LOGIC//////////

Template.list.allItems = function() {
  if(Session.get("sortBy") == "latest") {
    return Items.find({belongsTo: Session.get("currentList")._id},{sort: {lastEdited: -1}});
  } else {
  return Items.find({belongsTo: Session.get("currentList")._id},{sort: {rating: -1}}); //sorting by rating
  }
};

Template.list.events = {
  'click #newItemSubmit' : function(e) {
    e.preventDefault();
    Meteor.call('newItemSubmit', Session.get("currentList")._id,$("#newItemText").val(), function(error,result){
      if(error)
        notifyCallRes(error,result);
      if(result) {
        notifyCallRes(null, "Спасибо, запись добавлена! <a href='"+Meteor.absoluteUrl()+"#/list/"+Session.get("currentList").name+"/"+result+"'>Перейти к новой записи</a>.");
        Session.set("sortBy", "latest");
        $("#newItemText").val("");
        $("#newItemText").focus();
      }
    });
  },
  'click #sortLatest' : function() {
    Session.set('sortBy', 'latest');
  },
  'click #sortPopular' : function() {
    Session.set('sortBy', 'popular');
  }
};

Template.singleItem.author = function() {
  return Meteor.users.findOne(this.by).displayName;
};

Template.singleItem.itemUrl = function() {
  return Meteor.absoluteUrl()+"#/list/"+Session.get("currentList").name+"/"+this._id;
};

Template.singleItem.itemRating = function() {
  if(this.rating > 0)
    return "+"+this.rating;
  return this.rating;
}

Template.singleItem.itemRatingStyle = function() {
  if(this.rating > 0)
    return "label-success";
  return "label-important";
};

Template.singleItem.events = {
  'click #thumbsUpLink' : function(e) {
    e.preventDefault();
    Meteor.call('thumbsUpDown', "up", this._id, function(error, result){notifyCallRes(error, null);});
  },
  'click #thumbsDownLink' : function(e) {
    e.preventDefault();
    Meteor.call('thumbsUpDown', "down", this._id, function(error, result){notifyCallRes(error, null);});
  },  
};

Template.item.itemDetails = function() {
  var itemDetails = {};
  var theItem = Items.findOne(Session.get("currentItem")._id);
  if(theItem) {
    itemDetails.author = Meteor.users.findOne(theItem.by).displayName;
    itemDetails.content = theItem.content;
    if(theItem.rating > 0) {
      itemDetails.ratingStyle = "success";
      itemDetails.rating = "+"+theItem.rating;
    } else {
      itemDetails.ratingStyle = "danger";
      itemDetails.rating = theItem.rating;
    }
  }
  //console.log(itemDetails);
  return itemDetails;
};

Template.item.itemComments = function() {
  if(Items.findOne(Session.get("currentItem")._id)) {
    if(Comments.findOne({belongsTo: Session.get("currentItem")._id})) {
      //console.log(Session.get("sortBy"));
      if(Session.get("sortBy") == "popular") {
        return Comments.find({belongsTo: Session.get("currentItem")._id},{sort: {rating: -1}}); //sorting by rating
      } else {
        return Comments.find({belongsTo: Session.get("currentItem")._id},{sort: {timeStamp: -1}});
      }
    }
  }
};

Template.item.events = {
  'click #backToList' : function() {
    Router.navigate("#/list/"+Session.get("currentList").name+"/", true);
  },
  'click #thumbsUp' : function(e) {
    e.preventDefault();
    Meteor.call('thumbsUpDown', "up", Session.get("currentItem")._id, function(error, result){notifyCallRes(error, null);});
  },
  'click #thumbsDown' : function(e) {
    e.preventDefault();
    Meteor.call('thumbsUpDown', "down", Session.get("currentItem")._id, function(error, result){notifyCallRes(error, null);});
  },
  'click #newCommentSubmit' : function(e) {
    e.preventDefault();
    //console.log(Session.get("currentItem")._id);
    Meteor.call('addComment', Session.get("currentItem")._id, $("#newCommentText").val(), false, function(error, result){
      if(result) {
        notifyCallRes(null, "Спасибо, комментарий добавлен!");
        Session.set("sortBy", "latest");
      }
      if(error)
        notifyCallRes(error,null);
    });
  },
  'click #sortLatest' : function() {
    Session.set('sortBy', 'latest');
  },
  'click #sortPopular' : function() {
    Session.set('sortBy', 'popular');
  }
};

Template.singleComment.comment = function() {
  //console.log(this);
  var comment = {};
  if(Meteor.users.findOne(this.by)) {
    comment.author = Meteor.users.findOne(this.by).displayName;
    if(this.rating > 0){
      comment.ratingStyle = "label-success";
      comment.rating = "+"+this.rating;
    } else {
      comment.ratingStyle = "label-important";
      comment.rating = this.rating;
    }
  }
  return comment;
};

Template.singleComment.events = {
  'click #thumbsUpComment' : function(e) {
    e.preventDefault();
    Meteor.call('changeComment', this._id, "up", function(error, restult) {notifyCallRes(error,null)});
  },
  'click #thumbsDownComment' : function(e) {
    e.preventDefault();
    Meteor.call('changeComment', this._id, "down", function(error, restult) {notifyCallRes(error,null)});
  }
};

Template.navbar.allLists = function() {
  return Lists.find();
};

Template.navbar.rootStyle = function() {
  if(Session.get("currentView") == "main")
    return 'active';
}

Template.singleNavItem.isActiveList = function() {
  //console.log(this.name);
  if(Session.get("currentList")) {
    if(this.name == Session.get("currentList").name)
      return 'active';
  }
}

Template.welcome.events = {
  'click #loginButton' : function(e) {
    e.preventDefault();
    Meteor.loginWithFacebook();
  },
};

Template.settings.userName = function() {
  return Meteor.user().displayName;
}

Template.settings.userEmail = function() {
  return Meteor.user().email;
}

Template.settings.events = {
  'click #userSaveSettings' : function(e) {
    e.preventDefault();
    Meteor.call('userChangeSettings', $("#userDisaplayName").val(), $("#userEmail").val(), function(error, result){notifyCallRes(error,result);});
  },
  'click #userDelete' : function() {
    var sure = prompt("Вместе с Вашим аккаунтом будут удалены все записи и все комментарии. Их потом нельзя будет вернуть. Вы уверены? Напишите 'да' внизу если Вы хотите удалить свой акааунт и все с ним связанное.");
    if(sure == "да" || sure == "Да" || sure == "ДА") {
      Meteor.call('userDelete', function(error, result) {
        if(error)
          notify('error', error.reason);
        if(result) {
          notify('success', "Ваш аккаунт успешно удален");
          Meteor.setTimeout(Router.navigate("/", true), 1000);
        }  
      });
    } else {
      notify('success', "ну вот и слава Богу");
    }
  },
};

Template.admin.events = {
  'click #userToChangeSubmit' : function(e) {
    e.preventDefault();
    Meteor.call('changeUserRole', $("#userToChangeEmail").val(), $("#userToChangeNewRole").val(), function(error, result) {notifyCallRes(error,result);});
  },
  'click #newListSubmit' : function(e) {
    e.preventDefault();
    Meteor.call('addNewList', $("#newListName").val(), $("#newListDisplayName").val(), $("#newListDescription").val(), $("#newListHalfSentence").val(), function(error, result) {notifyCallRes(error, result);}); 
  },
  'click #updateListSubmit' : function(e) {
    e.preventDefault();
    Meteor.call('updateList', $("#oldListName").val(), $("#updatedListName").val(), $("#updatedListDisplayName").val(), $("#updatedListDescription").val(), $("#updatedListHalfSentence").val(), function(error,result) {notifyCallRes(error,result);});
  },
  'click #cleanUpBtn' : function(e) {
    e.preventDefault();
    var sure = prompt("are you sure? this can't be undone. type in 'yes' to confirm");
    if(sure == "yes" || sure == "YES" || sure == "Yes") {
      Meteor.call('cleanUpDb', $("#cleanUpDb").val(), function(error,result) {notifyCallRes(error,result)});   
    }
  }
};

//////////ROUTER///////////
var myRouter = Backbone.Router.extend({
  routes: {
    "list/:listName/*itemId": "list",
    "404" : "page404",
    "/404": "page404",
    "settings": "settings",
    "/settings":"settings",
    "admin": "admin",
    "/admin": "admin",
    "": "main",
    "*stuff": "page404"
  },
  main: function() {
    Session.set("loaded", false);
    Meteor.clearInterval(interval);
    Session.set("currentView", "main");
    Session.set("currentList", false);
  },
  settings: function() {
    Session.set("loaded", false);
    Meteor.clearInterval(interval);
    Session.set("currentView", "settings");
  },
  admin: function() {
    Session.set("loaded", false);
    Meteor.clearInterval(interval);
    Session.set("currentView", "admin");
  },
  list: function(listName, itemId) {
    Session.set("loaded", false);
    //console.log(itemId);
    Meteor.clearInterval(interval);
    var theList = Lists.findOne({name: listName});
    if (theList) {
      Session.set("currentView", "list");
      Session.set("currentList", theList);
      //console.log(itemId);
      if(itemId) {
        var theItem = Items.findOne(itemId);
        //console.log(theItem);
        if(theItem) {
          Session.set("currentItem", theItem);
          Session.set("currentView", "item");
        } else {
          Session.set("currentItem", false);
        }
      } else {
        Session.set("currentItem", false);
      }
    } else {
      if(Session.get("loaded")) {
        Session.set("currentView", "404");
      } else {
        console.log("loading...");
        loading('show');
        loadListByName(listName, itemId);
      }
    }
  },
  page404: function() {
    Meteor.clearInterval(interval);
    Session.set("currentView", "404");
  }

});

Router = new myRouter;

Meteor.startup(function () {
  Backbone.history.start();
});
