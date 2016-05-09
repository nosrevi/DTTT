angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, sharedConn, $state) {
//$scope is used to access the variables and functions defined within the html file
  $scope.goToRegister=function(){
    $state.go('register', {}, {location: "replace", reload: true});  //Forwards it to register page
  }

//Calling the login function in sharedConn
  $scope.login=function(user){  //gets user parameter
    //console.log(user.jid);
    sharedConn.login(user.jid, user.pass);
  }
})

.controller('ChatsCtrl', function($scope, Chats, $state, ChatDetails) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});
  $scope.chats = Chats.allRoster();  //gets the chats array

  //Remove functions
  $scope.remove = function(chat) {
  Chats.removeRoster(chat);  // Call the remove function
  };


  $scope.chatDetails=function(to_id){
  ChatDetailsObj.setTo(to_id);    // sets the to_jabber_id in the ChatDetails service so that it can be accessed within any class
  $state.go('tab.chat-detail', {}, {location: "replace", reload: true});
  };


  $scope.add = function(add_jid){
  Chats.addNewRosterContact(add_jid);  //Adding friend request
  };

})

.controller('ChatDetailCtrl', function($scope, $timeout, $ionicScrollDelegate, sharedConn, ChatDetails) {
    $scope.data = {};
  $scope.myId = sharedConn.getConnectObj().jid;
  $scope.messages = [];  // Holds the array of messages
  $scope.to_id=ChatDetails.getTo();  //ChatDetails service holds the to_jabber_id

  var isIOS = ionic.Platform.isIOS();

    $scope.sendMsg=function(to,body){
    var to_jid  = Strophe.getBareJidFromJid(to);
    var timestamp = new Date().getTime();

    //Creats a message xml dom object
    //Timestamp is used as the unique id for each message.
    //type = chat

    var reqChannelsItems = $msg({id:timestamp, to:to_jid , type: 'chat' })
                   .c("body").t(body);

    //Sends the message via connection object
    sharedConn.getConnectObj().send(reqChannelsItems.tree());
  };


  //This is basically a UI function to set the message UI
  $scope.showSendMessage = function() {

  $scope.sendMsg($scope.to_id,$scope.data.message);

    var d = new Date();
    d = d.toLocaleTimeString().replace(/:\d+ /, ' ');

  //Pushes our message to message array
    $scope.messages.push({
      userId: $scope.myId,
      text: $scope.data.message,
      time: d
    });

  //Remove message from the send text field
    delete $scope.data.message;

  //Scrolls to the bottom
    $ionicScrollDelegate.scrollBottom(true);

  };

  //Handles broadcast request -- ie msgRecievedBroadcast
     $scope.$on('msgRecievedBroadcast', function(event, data) {
    $scope.messageRecieve(data);
    })


  //Handles message recieve after broadcast response
  $scope.messageRecieve=function(msg){

  var from = msg.getAttribute('from');
  var type = msg.getAttribute('type');
  var elems = msg.getElementsByTagName('body');

  var d = new Date();
    d = d.toLocaleTimeString().replace(/:\d+ /, ' ');

  if (type == "chat" && elems.length > 0) {

    var body = elems[0];
    var textMsg = Strophe.getText(body);

    //Pushes recieved message into the message array
    $scope.messages.push({
      userId: from,
      text: textMsg,
      time: d
    });

    $ionicScrollDelegate.scrollBottom(true);
    $scope.$apply();

    console.log($scope.messages);
    console.log('Message recieved from ' + from + ': ' + textMsg);
  }

  }



  //-------------------****Helper Functions*******-------------------------------------
  $scope.inputUp = function() {
    if (isIOS) $scope.data.keyboardHeight = 216;
    $timeout(function() {
      $ionicScrollDelegate.scrollBottom(true);
    }, 300);

  };

  $scope.inputDown = function() {
    if (isIOS) $scope.data.keyboardHeight = 0;
    $ionicScrollDelegate.resize();
  };

  $scope.closeKeyboard = function() {
    // cordova.plugins.Keyboard.close();
  };
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
