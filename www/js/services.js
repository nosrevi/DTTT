angular.module('starter.services', [])
.factory('sharedConn', ['$ionicPopup','$state','$rootScope','$ionicPopup',function($ionicPopup,$state, $rootScope , $ionicPopup ){

  //Declaring the SharedConnObj which will be returned when we call sharedConn
   var SharedConnObj={};

  // Setting up the variables
   //SharedConnObj.BOSH_SERVICE = 'http://xvamp:7070/http-bind/';
   SharedConnObj.BOSH_SERVICE = 'http://bosh.metajack.im:5280/xmpp-httpbind';
   SharedConnObj.connection   = null;    // The main Strophe connection object.
   SharedConnObj.loggedIn=false;


   //------------------------------------------HELPER FUNCTIONS---------------------------------------------------------------
   SharedConnObj.getConnectObj=function(){
      return SharedConnObj.connection;
   };

   SharedConnObj.isLoggedIn=function(){
      return SharedConnObj.loggedIn;
   };

   //The jabber id ie user id will be usually of the form admin@xvamp\convertsdfs
   // We only need the part admin@xvamp
   //So we take the substring to get only admin@xvamp
   SharedConnObj.getBareJid=function(){
    var str=SharedConnObj.connection.jid;
    str=str.substring(0, str.indexOf('/'));
        return str;
     };



   //--------------------------------------***END HELPER FUNCTIONS***----------------------------------------------------------

  //Login Function
  SharedConnObj.login=function (jid, pass) {
  //Strophe syntax
  // We are creating Strophe connection Object
    //SharedConnObj.connection = new Strophe.Connection( SharedConnObj.BOSH_SERVICE , {'keepalive': true});  // We initialize the Strophe connection.
    SharedConnObj.connection = new Strophe.Connection( SharedConnObj.BOSH_SERVICE);  // We initialize the Strophe connection.
    SharedConnObj.connection.connect(jid, pass , SharedConnObj.onConnect);
    //Here onConnect is the callback function
    //ie after getting the response for connect() function onConnect() is called with the response
  };

  //On connect XMPP
  SharedConnObj.onConnect=function(status){
    //Self explanatory

    if (status == Strophe.Status.CONNECTING) {
      console.log('Strophe is connecting.');
    } else if (status == Strophe.Status.CONNFAIL) {
      console.log('Strophe failed to connect.');
    } else if (status == Strophe.Status.DISCONNECTING) {
      console.log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
      console.log('Strophe is disconnected.');
    } else if (status == Strophe.Status.CONNECTED) {
      console.log('Strophe is connected.');

        //The connection is established. ie user is logged in

        // We are adding handler function for accetping message response
        //ie handler function  [ onMessage() ]  will be call when the user recieves a new message
        SharedConnObj.connection.addHandler(SharedConnObj.onMessage, null, 'message', null, null ,null);

        //Setting our presence in the server. so that everyone can know that we are online
        SharedConnObj.connection.send($pres().tree());
        SharedConnObj.loggedIn=true;

        //Handler function for handling new Friend Request
        SharedConnObj.connection.addHandler(SharedConnObj.on_subscription_request, null, "presence", "subscribe");

        //Now finally go the Chats page
        $state.go('tab.dash', {}, {location: "replace", reload: true});
    }
  };


  //When a new message is recieved
  SharedConnObj.onMessage=function(msg){
    //Here we will braodcast that we have recieved a message.
    //This broadcast will be handled in the 'Chat Details controller'
    //In broadcast we are also sending the message
    $rootScope.$broadcast('msgRecievedBroadcast', msg );
    return true;
  };

  SharedConnObj.register=function (jid,pass,name) {
    //to add register function
  };

  //Logout funcion
  SharedConnObj.logout=function () {
    console.log("logout called");  //In chrome you can use console.log("TEXT") for dubugging
    SharedConnObj.connection.options.sync = true; // Switch to using synchronous requests since this is typically called onUnload.
    SharedConnObj.connection.flush();  //Removes all the connection variables
    SharedConnObj.connection.disconnect(); //Disconnects from the server
  };

  SharedConnObj.on_subscription_request = function(stanza){

    console.log(stanza);  //Debuggin

    //Handling subscribe request ... ie freind request
    if(stanza.getAttribute("type") == "subscribe" && !is_element_map(stanza.getAttribute("from")) )
    {
      //the friend request is recieved from Client 2

      //Creats a ionic popup
      var confirmPopup = $ionicPopup.confirm({
         title: 'Confirm Friend Request!',
         template: ' ' + stanza.getAttribute("from")+' wants to be your freind'
      });


      // Yes or No option
       confirmPopup.then(function(res) {
       if(res) {
       //Inorder to say that you have accepted their friend request, you just have to send them a 'presence' with 'type = subscribed'
         SharedConnObj.connection.send($pres({ to: stanza.getAttribute("from") , type: "subscribed" }));

         //Adds the accepted jabber id to the map
         push_map( stanza.getAttribute("from") );

       } else {

         // Rejected the Friend Request
         SharedConnObj.connection.send($pres({ to: stanza.getAttribute("from") , type: "unsubscribed" }));

       }
       });

      return true;
    }

  }

  //---------------------Helper Function------------------------------
  //This is used as a helper function for on_subscription_request
  // These functions ensure that you dont need to accept the friend request of a person again and again.

  //Basically we are adding the accepted friends jabber id to a map, and checking if the new friend request is alredy accpeted or not.

  var accepted_map={};  //store all the accpeted jid

  //Check if the jabber id is in the map
  function is_element_map(jid){
    if (jid in accepted_map) {return true;}
    else {return false;}
  }

  //Adds jabber id into the map
  function push_map(jid){
    accepted_map[jid]=true;
  }
  //--------------------------------------------




  //Finally returns  the SharedConnObj
  return SharedConnObj;
}])

.factory('Chats', ['sharedConn','$rootScope','$state', function(sharedConn,$rootScope,$state){

  ChatsObj={};

  connection=sharedConn.getConnectObj();  //gets the connection object from SharedConn
  ChatsObj.roster=[]; //Holds the roster list


  // This will load the rosters
  loadRoster= function() {

      //Sends the roster iq (*iq => Information Query)
      var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});

        connection.sendIQ(iq,

          //-----------*********Handler function for -> On recieve roster iq****---------------------------//
          function(iq) {

            if (!iq || iq.length == 0)  // if nothing recieved then send null
              return;

            //jquery load data after loading the page.This function updates data after jQuery loading
            $rootScope.$apply(function() {

              $(iq).find("item").each(function(){

                ChatsObj.roster.push({
                  id: $(this).attr("jid"),
                  name:  $(this).attr("name") || $(this).attr("jid"),
                  lastText: 'Available to Chat',
                  face: 'img/ben.png'
                });

              });

            });

          });
          //------------------------*************END*******----------------------------------------------//

          // set up presence handler and send initial presence
          connection.addHandler(

          //-----------------****Handler function for -> on recieve precence iq********----------------//
            function (presence){

               var from = $(presence).attr('from'); // the jabber_id of the contact
               if (presence_type != 'error'){
               if (presence_type === 'unavailable'){
                console.log("offline"); //alert('offline');
               }else{
                 var show = $(presence).find("show").text(); // this is what gives away, dnd, etc.
                 if (show === 'chat' || show === ''){
                 console.log("online"); //alert('online');
                 }else{
                 console.log("etc");//alert('etc');
                 }
               }
               }
               return true;
            }
          //----------------------------------****END****------------------------------------------------//
          , null, "presence");

          connection.send($pres());

          connection.addHandler(

            //----------------******handler function for on recieve update roster iq****--------------//
            function(iq) {

              if (!iq || iq.length == 0)
                return;

              //jquery load data after loading the page.This function updates data after jQuery loading
              $rootScope.$apply(function() {

                //Jquery code
                /*
                Basically $(iq) is an xml response.
                find("item") will return the array of <item subscription="value" />
                each( function(){}  is used to loop through all items

                */
                $(iq).find("item").each( function(){

                  //roster update via Client 1(ie this client) accepting request
                  if($(this).attr("subscription")=="from"){

                    ChatsObj.roster.push({
                      id: $(this).attr("jid"),
                      name:  $(this).attr("name") || $(this).attr("jid"),
                      lastText: 'Available to Chat',
                      face: 'img/ben.png'
                    });
                  }

                  // Waiting for the Client 2 to accept the request
                  else if ( $(this).attr("subscription")=="none"  && $(this).attr("ask")=="subscribe" ){

                    ChatsObj.roster.push({
                      id: $(this).attr("jid"),
                      name:  $(this).attr("name") || $(this).attr("jid"),
                      lastText: 'Waiting to Accept',   // Adds roster and waits for the client 2 to accept request
                      face: 'img/ben.png'
                    });


                  }

                  //roster update via Client 2 deleting the roster contact
                  else if($(this).attr("subscription")=="none"){
                    //Removes the roster
                    ChatsObj.removeRoster( ChatsObj.getRoster( $(this).attr("jid") ) );
                  }

                });

                //Reloads the page
                $state.go('tab.chats', {}, {location: "replace", reload: true});

              });

            }
          //----------------------------------****END****------------------------------------------------//

          ,"jabber:iq:roster", "iq", "set");


          return ChatsObj.roster;

  }


  //Helper function
  ChatsObj.allRoster= function() {
    loadRoster();
    return ChatsObj.roster;
  }

  //splice is used to remove object from an array
  ChatsObj.removeRoster= function(chat) {
    ChatsObj.roster.splice(ChatsObj.roster.indexOf(chat), 1);
  }

  //Gets the roster with id
  ChatsObj.getRoster= function(chatId) {
    for (var i = 0; i < ChatsObj.roster.length; i++) {
      if (ChatsObj.roster[i].id == chatId) {
        return ChatsObj.roster[i];
      }
      }
  }

  //Add Friend Request
  ChatsObj.addNewRosterContact=function(to_id){
    console.log(to_id);
    connection.send($pres({ to: to_id , type: "subscribe" }));
  }


  return ChatsObj;

}])

.factory('ChatDetails', ['sharedConn','$rootScope', function(sharedConn,$rootScope){
  ChatDetailsObj={};

  ChatDetailsObj.setTo = function(to_id){
    ChatDetailsObj.to=to_id;
  }
  ChatDetailsObj.getTo = function(){
    return ChatDetailsObj.to;
  }

  return ChatDetailsObj;
}])
