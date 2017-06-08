
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);


exports.sendMessageNotification = functions.database.ref('/chats/{chatId}/{messageId}').onWrite(event => {
  
	const chatId = event.params.chatId;
	const messageId = event.params.messageId;
	let senderID;
	let receiverID;
	const getSenderPromise = admin.database().ref(`/chats/${chatId}/${messageId}`).once('value')
 
  const getDeviceTokensPromise = admin.database().ref(`/users/5caabad0-4c10-11e7-bf91-0158263e9fe1`).once('value');

	return Promise.all([getSenderPromise , getDeviceTokensPromise]).then(results => {
    const getSender = results[0].val();
    const IDarray = chatId.split(",");
    if (getSender.from == IDarray[0]) {
      console.log('pehla wala chala')
      senderID = IDarray[0]
      receiverID = IDarray[1]
    } else {
      console.log('dosra wala chala')
      senderID = IDarray[1]
      receiverID = IDarray[0]
    }
    console.log('checking inside promiseAll!', senderID, receiverID)
    
    const tokensSnapshot = results[1];
    if (!tokensSnapshot.hasChildren()) {
      return console.log('There are no notification tokens to send to.');
    }
    console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');
    console.log('Fetched receiver profile', tokensSnapshot.val());

    const payload = {
      notification: {
        title: 'You have a new Message!',
        body: `Apka apna Amir bhai has sent you a message.`,
      }
    };

    const tokens = tokensSnapshot.val().registrationId;
    console.log('token',tokens)
    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokens, payload).then(response => {
      console.log('response under sendToDevice: ',response)
      // For each message check if there was an error.
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('Failure sending notification to', tokens[index], error);
          // Cleanup the tokens who are not registered anymore.
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
          }
        }
      });
      return Promise.all(tokensToRemove);
    });
	})

});
