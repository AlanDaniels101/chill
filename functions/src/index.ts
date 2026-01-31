/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {formatDistanceToNow} from "date-fns";

import {initializeApp} from "firebase-admin/app";
// import {getAuth} from "firebase-admin/auth";
import {getDatabase} from "firebase-admin/database";
import {getMessaging} from "firebase-admin/messaging";
import {onValueCreated, onValueDeleted} from "firebase-functions/v2/database";
import {FirebaseError} from "firebase-admin";

initializeApp();

// const auth = getAuth();
const database = getDatabase();

/** Request payload for logPhoneAuthAttempt callable */
interface LogPhoneAuthAttemptRequest {
  phoneNumber: string;
  deviceInfo?: Record<string, unknown>;
}

/**
 * Callable function to log phone auth attempts (signInWithPhoneNumber).
 * Called from the client when a user attempts phone sign-in.
 */
export const logPhoneAuthAttempt = onCall<LogPhoneAuthAttemptRequest>(
    {enforceAppCheck: false},
    async (request) => {
      const {phoneNumber, deviceInfo} = request.data || {};
      if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
        throw new HttpsError("invalid-argument", "phoneNumber is required and must be a non-empty string.");
      }
      const payload = {
        phoneNumber: phoneNumber.trim(),
        deviceInfo: deviceInfo && typeof deviceInfo === "object" ? deviceInfo : {},
        timestamp: Date.now(),
      };
      logger.info("Phone auth attempt", payload);
      return {success: true};
    }
);
const messaging = getMessaging();

/**
 * Helper function to send notifications to group members
 * @param {string} groupId - The group ID
 * @param {string} hangoutId - The hangout ID
 * @param {object} message - The FCM message object
 * @return {Promise<void>}
 */
async function sendNotificationsToGroup(
    groupId: string,
    hangoutId: string,
    message: {
        notification: { title: string; body: string };
        data: { groupId: string; hangoutId: string; type: string; title: string; body: string; click_action: string };
        android: {
            priority: "high";
            notification: {
                clickAction: string;
                channelId: string;
                icon: string;
                color: string;
            };
        };
        apns: {
            headers: {
                "apns-priority": string;
            };
            payload: {
                aps: {
                    sound: string;
                    badge: number;
                    contentAvailable: boolean;
                };
            };
        };
    }
): Promise<void> {
    // Fetch the group members
    const groupRef = database.ref(`groups/${groupId}/members`);
    const groupMembers = (await groupRef.once("value")).val() || {};
    logger.debug(`Group members: ${JSON.stringify(groupMembers)}`);

    // Filter out users who have subscribed to notifications for this group
    const subscribedMembers = [];
    for (const memberId of Object.keys(groupMembers)) {
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

        // Get the hangout details
        const hangoutName = hangout?.name || "New hangout";
        const hangoutDistance = hangout?.time ? `in ${formatDistanceToNow(hangout.time, {addSuffix: true})}` : "soon";

        // Get the group name
        const groupSnapshot = await database.ref(`groups/${groupId}`).once("value");
        const groupName = groupSnapshot.val()?.name || "your group";

        // Create the notification message
        const message = {
            notification: {
                title: `New Hangout ${groupName ? `in ${groupName}` : ""}!`,
                body: `"${hangoutName}" is happening ${hangoutDistance}`,
            },
            data: {
                groupId: groupId,
                hangoutId: hangoutId,
                type: "new_hangout",
                title: `New Hangout in ${groupName}`,
                body: `"${hangoutName}" is happening ${hangoutDistance}`,
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

        await sendNotificationsToGroup(groupId, hangoutId, message);
    }
);

export const notifyPollClosed = onValueDeleted(
    "hangouts/{hangoutId}/datetimePollInProgress",
    async (event) => {
        const hangoutId = event.params.hangoutId;
        logger.info(`Poll closed (datetimePollInProgress deleted) - Hangout ID: ${hangoutId}`);
        
        // Get the hangout data to verify time is set
        const hangoutRef = database.ref(`hangouts/${hangoutId}`);
        const hangout = (await hangoutRef.once("value")).val();
        
        if (!hangout) {
            logger.warn(`Hangout ${hangoutId} not found, skipping notification`);
            return;
        }
        
        // Verify that time is set (poll was closed with a date selected)
        if (!hangout.time || typeof hangout.time !== "number") {
            logger.debug("Hangout time not set, skipping notification");
            return;
        }
        
        // Get the group ID from the hangout
        const groupId = hangout.group;
        if (!groupId) {
            logger.warn("Hangout doesn't have a groupId, skipping notification");
            return;
        }

        // Get the hangout details
        const hangoutName = hangout?.name || "Hangout";
        const selectedDate = new Date(hangout.time);
        const formattedDate = formatDistanceToNow(selectedDate, {addSuffix: true});

        // Create the notification message
        const message = {
            notification: {
                title: `Poll Closed: ${hangoutName}`,
                body: `The date has been set to ${formattedDate}`,
            },
            data: {
                groupId: groupId,
                hangoutId: hangoutId,
                type: "poll_closed",
                title: `Poll Closed: ${hangoutName}`,
                body: `The date has been set to ${formattedDate}`,
                click_action: "OPEN_HANGOUT_DETAILS",
            },
            // Android specific configuration
            android: {
                priority: "high" as const,
                notification: {
                    clickAction: "OPEN_HANGOUT_DETAILS",
                    channelId: "hangouts",
                    icon: "notification_icon",
                    color: "#4CAF50",
                },
            },
            // iOS specific configuration
            apns: {
                headers: {
                    "apns-priority": "10",
                },
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                        contentAvailable: true,
                    },
                },
            },
        };

        await sendNotificationsToGroup(groupId, hangoutId, message);
    }
);

export const handleGroupMembershipDeleted = onValueDeleted(
    "groups/{groupId}/members/{userId}",
    async (event) => {
        const groupId = event.params.groupId;
        const userId = event.params.userId;

        logger.info(`Group membership deleted - Group: ${groupId}, User: ${userId}`);
            
        try {
            // Remove the group from user's groups list
            await database.ref(`users/${userId}/groups/${groupId}`).remove();
            logger.info(`Removed group ${groupId} from user ${userId}'s groups list`);
        } catch (error) {
            logger.error("Error removing group from user's list: ", error);
        }
    }
);

export const handleGroupMembershipUpdated = onValueCreated(
    "groups/{groupId}/members/{userId}",
    async (event) => {
        const {groupId, userId} = event.params;
        const data = event.data.val();

        logger.info(`Group membership created - Group: ${groupId}, User: ${userId}`);
        logger.info("Data:", data);

        // If the user is being added to the group (data is true)
        if (data === true) {
            logger.info(`[Group Membership] User ${userId} is being added to group ${groupId}`);

            // Add the group to the user's groups list
            await database.ref(`users/${userId}/groups/${groupId}`).set(true);
            
            try {
                // Enable notifications by default for the user in this group
                await database
                    .ref(`users/${userId}/notificationPreferences/${groupId}`)
                    .set(true);
                
                logger.info(`[Group Membership] Enabled notifications by default for 
                    user ${userId} in group ${groupId}`);
            } catch (error) {
                logger.error(`[Group Membership] Error enabling notifications for 
                    user ${userId}:`, error);
            }
        }
    }
);

export const handleUserDeletion = onValueDeleted(
    "users/{userId}",
    async (event) => {
        const userId = event.params.userId;
        
        try {
            // Get user's data before it's deleted
            const userData = event.data.val();
            if (!userData) {
                logger.warn(`No user data found for ${userId}`);
                return;
            }

            const userGroups = userData.groups || {};
            const updates: { [path: string]: boolean | null } = {};

            // For each group the user is in
            for (const groupId of Object.keys(userGroups)) {
                logger.info(`Processing group ${groupId} for user ${userId}`);
                
                // Check if user is an admin
                const isAdmin = await database.ref(`/groups/${groupId}/admins/${userId}`).once("value");
                
                if (isAdmin.exists()) {
                    logger.info(`User ${userId} is an admin of group ${groupId}`);
                    // Get all admins of the group
                    const adminsSnapshot = await database.ref(`/groups/${groupId}/admins`).once("value");
                    const admins = adminsSnapshot.val() || {};
                    
                    // If this is the last admin
                    if (Object.keys(admins).length === 1) {
                        logger.info(`User ${userId} is the last admin of group ${groupId}`);
                        // Get all members of the group
                        const membersSnapshot = await database.ref(`/groups/${groupId}/members`).once("value");
                        const members = membersSnapshot.val() || {};
                        
                        // Find another member to make admin (excluding the user being deleted)
                        const otherMembers = Object.keys(members).filter((id: string) => id !== userId);
                        
                        if (otherMembers.length === 0) {
                            // If no other members, delete the group
                            updates[`/groups/${groupId}`] = null;
                            logger.info(`Deleting group ${groupId} as it has no remaining members`);
                            continue; // Skip the rest of the group cleanup since we're deleting it
                        }
                        
                        // Make the first other member an admin
                        updates[`/groups/${groupId}/admins/${otherMembers[0]}`] = true;
                        logger.info(`Transferred admin rights in group ${groupId} to user ${otherMembers[0]}`);
                    }
                }

                // Remove user from group members and admins
                updates[`/groups/${groupId}/members/${userId}`] = null;
                updates[`/groups/${groupId}/admins/${userId}`] = null;
                logger.info(`Removed user ${userId} from group ${groupId} members and admins`);

                // Get all hangouts for this group
                const groupHangoutsSnapshot = await database.ref(`/groups/${groupId}/hangouts`).once("value");
                const groupHangouts = groupHangoutsSnapshot.val() || {};
                logger.info(`Found ${Object.keys(groupHangouts).length} hangouts in group ${groupId}`);

                // For each hangout in the group
                for (const hangoutId of Object.keys(groupHangouts)) {
                    // Check if user is an attendee
                    const hangoutSnapshot = await database
                        .ref(`/hangouts/${hangoutId}/attendees/${userId}`)
                        .once("value");
                    if (hangoutSnapshot.exists()) {
                        // Remove user from hangout attendees
                        updates[`/hangouts/${hangoutId}/attendees/${userId}`] = null;
                        logger.info(`Removed user ${userId} from hangout ${hangoutId} attendees`);
                    }
                }
            }

            // Perform all updates in a single transaction
            await database.ref().update(updates);
            
            logger.info(`Successfully cleaned up data for deleted user: ${userId}`);
        } catch (error) {
            logger.error(`Error cleaning up data for deleted user ${userId}:`, error);
            throw error; // Re-throw to ensure Firebase retries the function
        }
    }
);

export const handleGroupDeletion = onValueDeleted(
    "groups/{groupId}",
    async (event) => {
        const groupId = event.params.groupId;
        logger.info(`Starting cleanup for deleted group: ${groupId}`);
        
        try {
            // Get the group data from the event
            const groupData = event.data.val();
            if (!groupData) {
                logger.warn(`No group data found for ${groupId}`);
                return;
            }

            const groupHangouts = groupData.hangouts || {};
            logger.info(`Found ${Object.keys(groupHangouts).length} hangouts to delete for group ${groupId}`);
            
            const updates: { [path: string]: boolean | null } = {};
            
            // Delete all hangouts associated with this group
            for (const hangoutId of Object.keys(groupHangouts)) {
                updates[`/hangouts/${hangoutId}`] = null;
                logger.info(`Marked hangout ${hangoutId} for deletion`);
            }
            
            // Perform all updates in a single transaction
            await database.ref().update(updates);
            
            logger.info(`Successfully deleted all ${Object.keys(groupHangouts).length} hangouts for group: ${groupId}`);
        } catch (error) {
            logger.error(`Error deleting hangouts for group ${groupId}:`, error);
            throw error; // Re-throw to ensure Firebase retries the function
        }
    }
);
