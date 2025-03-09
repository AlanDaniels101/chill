/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import {initializeApp} from "firebase-admin/app";
// import {getAuth} from "firebase-admin/auth";
import {getDatabase} from "firebase-admin/database";
import {getMessaging} from "firebase-admin/messaging";
import {onValueCreated} from "firebase-functions/v2/database";
import {FirebaseError} from "firebase-admin";

initializeApp();

// const auth = getAuth();
const database = getDatabase();
const messaging = getMessaging();

export const notifyGroupSubscribers = onValueCreated(
    "groups/{groupId}/hangouts/{hangoutId}",
    async (event) => {
        const hangoutId = event.params.hangoutId;
        const groupId = event.params.groupId;
        
        // Get the value directly from the event data
        let hangout = event.data.val();
        logger.info(`New hangout created - ID: ${hangoutId}, Group: ${groupId}`);
        
        // Log the complete hangout object for debugging
        logger.info("Complete hangout object:", JSON.stringify(hangout));
        
        // Check if createdBy exists
        if (!hangout || typeof hangout !== "object" || !hangout.createdBy) {
            logger.warn(`Missing createdBy field in hangout. Hangout data: ${JSON.stringify(hangout)}`);
            
            // Try to fetch the hangout directly from the database to verify
            const hangoutRef = database.ref(`groups/${groupId}/hangouts/${hangoutId}`);
            const hangoutSnapshot = await hangoutRef.once("value");
            const hangoutFromDb = hangoutSnapshot.val();
            
            logger.info("Hangout fetched directly from DB:", JSON.stringify(hangoutFromDb));
            
            // Use the createdBy from the direct DB fetch if available
            if (hangoutFromDb && hangoutFromDb.createdBy) {
                hangout.createdBy = hangoutFromDb.createdBy;
                logger.info(`Found createdBy from direct DB fetch: ${hangout.createdBy}`);
            } else {
                logger.warn("Could not find createdBy field even in direct DB fetch");
            }
        }
        
        // If hangout is just a boolean or not an object, wait and try again
        if (hangout === true || typeof hangout !== "object" || !hangout) {
            logger.info("Hangout is just a placeholder. Waiting for complete data...");
            
            // Wait a short time for the data to be updated
            await new Promise((resolve) => setTimeout(resolve, 2000));
            
            // Try to fetch the complete hangout data
            const hangoutRef = database.ref(`groups/${groupId}/hangouts/${hangoutId}`);
            const hangoutFromDb = (await hangoutRef.once("value")).val();
            
            logger.info("Hangout fetched after delay:", JSON.stringify(hangoutFromDb));
            
            // Use the fetched data if it's an object
            if (hangoutFromDb && typeof hangoutFromDb === "object") {
                hangout = hangoutFromDb;
                logger.info(`Using updated hangout data with creator: ${hangout?.createdBy}`);
            }
        }
        
        // Fetch the group members
        const groupRef = database.ref(`groups/${groupId}/members`);
        const groupMembers = (await groupRef.once("value")).val() || {};
        logger.debug(`Group members: ${JSON.stringify(groupMembers)}`);

        // Filter out users who have subscribed to notifications for this group
        const subscribedMembers = [];
        for (const memberId of Object.keys(groupMembers)) {
            // Skip the creator of the hangout
            // if (memberId === hangout.createdBy) {
            //     logger.debug(`Skipping creator: ${memberId}`);
            //     continue;
            // }
            
            // Check user's notification preferences in the users collection
            const userPrefsRef = database.ref(`users/${memberId}/notificationPreferences/${groupId}`);
            const notificationEnabled = (await userPrefsRef.once("value")).val();
            
            if (notificationEnabled) {
                subscribedMembers.push(memberId);
            }
        }
        logger.debug(`Subscribed members: ${JSON.stringify(subscribedMembers)}`);
        
        // Get FCM tokens for subscribed members
        const fcmTokens: string[] = [];
        for (const memberId of subscribedMembers) {
            // Get the user's FCM token from the database
            const userRef = database.ref(`users/${memberId}/fcmToken`);
            const fcmToken = (await userRef.once("value")).val();
            
            if (fcmToken) {
                fcmTokens.push(fcmToken);
            }
        }
        logger.debug(`FCM tokens retrieved: ${fcmTokens.length}`);

        // Skip if no tokens to send to
        if (fcmTokens.length === 0) {
            logger.debug("No FCM tokens to send notifications to");
            return;
        }

        // Get the hangout details
        const hangoutName = hangout?.name || "New hangout";
        const hangoutTime = hangout?.time ? new Date(hangout.time).toLocaleString() : "soon";

        // Get the group name
        const groupSnapshot = await database.ref(`groups/${groupId}`).once("value");
        const groupName = groupSnapshot.val()?.name || "your group";

        // Create the notification message
        const message = {
            notification: {
                title: `New Hangout ${groupName ? `in ${groupName}` : ""}!`,
                body: `"${hangoutName}" is happening ${hangoutTime}`,
            },
            data: {
                groupId: groupId,
                hangoutId: hangoutId,
                type: "new_hangout",
                title: `New Hangout in ${groupName}`,
                body: `"${hangoutName}" is happening ${hangoutTime}`,
                click_action: "OPEN_HANGOUT_DETAILS",
            },
            // Android specific configuration
            android: {
                priority: "high" as const,
                notification: {
                    clickAction: "OPEN_HANGOUT_DETAILS",
                    channelId: "hangouts", // Add a channel ID
                    icon: "notification_icon", // Default icon
                    color: "#4CAF50",
                },
            },
            // iOS specific configuration
            apns: {
                headers: {
                    "apns-priority": "10", // High priority
                },
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                        contentAvailable: true, // Important for background delivery
                    },
                },
            },
        };

        // Log the message for debugging
        logger.info("Sending FCM message:", JSON.stringify(message));

        try {
            // Create messages for each token
            const messages = fcmTokens.map((token: string) => ({
                ...message,
                token: token,
            }));
            
            // Send the notifications
            const response = await messaging.sendEach(messages);
            logger.info(`Notifications sent: ${response.successCount}/${fcmTokens.length}`);
            
            // Log any failures
            if (response.failureCount > 0) {
                const failedTokens: {token: string, error: FirebaseError | unknown}[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push({token: fcmTokens[idx], error: resp.error});
                    }
                });
                logger.error("Failed to send notifications:", failedTokens);
            }
        } catch (error) {
            logger.error("Error sending notifications:", error);
        }
    }
);
