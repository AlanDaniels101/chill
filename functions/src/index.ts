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
import {onValueCreated, onValueUpdated} from "firebase-functions/v2/database";
import {FirebaseError} from "firebase-admin";

initializeApp();

// const auth = getAuth();
const database = getDatabase();
const messaging = getMessaging();

export const notifyGroupSubscribers = onValueCreated(
    "hangouts/{hangoutId}",
    async (event) => {
        const hangoutId = event.params.hangoutId;
        logger.info(`New hangout created - ID: ${hangoutId}`);
        
        const hangout = event.data.val();
        logger.debug("Hangout object:", JSON.stringify(hangout));
        
        if (!hangout || typeof hangout !== "object") {
            logger.warn("Invalid hangout data, skipping notification");
            return;
        }
        
        // Get the group ID from the hangout
        const groupId = hangout.group;
        if (!groupId) {
            logger.warn("Hangout doesn't have a groupId, skipping notification");
            return;
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
        const hangoutTime = hangout?.time ? `on ${new Date(hangout.time).toLocaleString()}` : "soon";

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

        logger.debug("Sending FCM message:", JSON.stringify(message));

        try {
            // Create messages for each token
            const messages = fcmTokens.map((token: string) => ({
                ...message,
                token: token,
            }));
            
            // Send the notifications
            const response = await messaging.sendEach(messages);
            logger.debug(`Notifications sent: ${response.successCount}/${fcmTokens.length}`);
            
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

export const handleGroupMembershipChange = onValueUpdated(
    "groups/{groupId}/members/{userId}",
    async (event) => {
        const groupId = event.params.groupId;
        const userId = event.params.userId;
        const beforeData = event.data.before.val();
        const afterData = event.data.after.val();

        logger.info(`Group membership change detected - Group: ${groupId}, User: ${userId}`);

        // If the user was removed from the group
        if (beforeData && !afterData) {
            logger.info(`User ${userId} was removed from group ${groupId}`);
            
            try {
                // Remove the group from user's groups list
                await database.ref(`users/${userId}/groups/${groupId}`).remove();
                logger.info(`Removed group ${groupId} from user ${userId}'s groups list`);
            } catch (error) {
                logger.error("Error removing group from user's list: ", error);
            }
        }
    }
);
