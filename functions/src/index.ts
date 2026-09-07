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
import {getDatabase} from "firebase-admin/database";
import {getMessaging} from "firebase-admin/messaging";
import {onValueCreated, onValueDeleted} from "firebase-functions/v2/database";
import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {FirebaseError} from "firebase-admin";
import {getAuth} from "firebase-admin/auth";
import {GoogleAuth} from "google-auth-library";

initializeApp();

const auth = getAuth();
const database = getDatabase();

/**
 * Pub/Sub topic name for GCP billing budget alerts. Create this topic in
 * Cloud Console (Pub/Sub), then add it to your budget's programmatic
 * notifications (Billing → Budgets & alerts → Edit budget → Manage
 * notifications → Add Pub/Sub topic).
 */
const BILLING_ALERT_TOPIC = "billing-budget-alerts";

/**
 * Decodes a Cloud Billing budget notification and reports whether the budget
 * has been fully spent. Budgets republish to the topic roughly every 20
 * minutes even when nothing changed, and alertThresholdExceeded is only set
 * when a threshold is crossed, so the lower default thresholds (50% and 90%)
 * stay informational and only a full overrun triggers a shutdown.
 * @param {string | undefined} data - Base64 Pub/Sub message payload.
 * @return {Record<string, unknown> | null} The notification when the budget
 *   is fully spent, otherwise null.
 */
function parseExceededBudgetNotification(data: string | undefined): Record<string, unknown> | null {
  if (!data) {
    return null;
  }
  let notification: Record<string, unknown>;
  try {
    notification = JSON.parse(Buffer.from(data, "base64").toString("utf-8")) as Record<string, unknown>;
  } catch (e) {
    logger.warn("Failed to decode billing notification", e);
    return null;
  }
  const threshold = notification.alertThresholdExceeded;
  if (typeof threshold !== "number" || threshold < 1) {
    return null;
  }
  return notification;
}

/**
 * When the billing budget is fully spent, disables phone authentication by
 * setting SMS region config to an empty allowlist (no regions allowed = no
 * phone sign-in). Firebase does not expose a "disable phone provider" API;
 * the empty allowlist is the only programmatic way to achieve the same
 * effect. Requires the topic to exist and be attached to your budget.
 */
export const disablePhoneAuthOnBillingAlert = onMessagePublished(
    BILLING_ALERT_TOPIC,
    async (event) => {
      const notification = parseExceededBudgetNotification(event.data?.message?.data);
      if (!notification) {
        return;
      }

      logger.warn("Billing budget spent, disabling phone auth", {
        budgetDisplayName: notification.budgetDisplayName,
        costAmount: notification.costAmount,
        budgetAmount: notification.budgetAmount,
      });

      try {
        await auth.projectConfigManager().updateProjectConfig({
          smsRegionConfig: {
            allowlistOnly: {allowedRegions: []},
          },
        });
        logger.info("Phone authentication disabled via SMS region allowlist (no regions allowed).");
      } catch (err) {
        logger.error("Failed to disable phone auth", err);
        throw err;
      }
    }
);

/**
 * Ruleset published when the storage budget is exceeded. Writes are denied
 * everywhere; `get` stays open because existing profile images are served via
 * long-lived download URLs that bypass rules anyway, so denying reads would
 * break the UI without reducing egress.
 */
const STORAGE_LOCKDOWN_RULES = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow get: if request.auth != null;
      allow list, write: if false;
    }
  }
}
`;

const RULES_API = "https://firebaserules.googleapis.com/v1";

const rulesAuth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/firebase"],
});

/** A Firebase Security Rules release, as returned by the Rules API. */
interface RulesRelease {
  name: string;
  rulesetName: string;
}

/**
 * Finds the Cloud Storage rules release for this project. The release is
 * looked up rather than constructed so the bucket name never has to be
 * hardcoded here.
 * @param {string} projectId - The GCP project ID.
 * @return {Promise<RulesRelease>} The Cloud Storage rules release.
 */
async function getStorageRulesRelease(projectId: string): Promise<RulesRelease> {
  const client = await rulesAuth.getClient();
  const res = await client.request<{releases?: RulesRelease[]}>({
    url: `${RULES_API}/projects/${projectId}/releases`,
  });
  const prefix = `projects/${projectId}/releases/firebase.storage/`;
  const release = (res.data.releases || []).find((r) => r.name.startsWith(prefix));
  if (!release) {
    throw new Error("No Cloud Storage rules release found. Deploy storage rules before relying on this function.");
  }
  return release;
}

/**
 * Reads the rules source belonging to a ruleset.
 * @param {string} rulesetName - Full ruleset resource name.
 * @return {Promise<string>} The concatenated rules source.
 */
async function getRulesetSource(rulesetName: string): Promise<string> {
  const client = await rulesAuth.getClient();
  const res = await client.request<{source?: {files?: {content?: string}[]}}>({
    url: `${RULES_API}/${rulesetName}`,
  });
  return (res.data.source?.files || []).map((file) => file.content || "").join("\n");
}

/**
 * Creates the lockdown ruleset and points the Cloud Storage release at it.
 * @param {string} projectId - The GCP project ID.
 * @param {string} releaseName - Full release resource name to repoint.
 * @return {Promise<string>} The newly created ruleset name.
 */
async function publishStorageLockdown(projectId: string, releaseName: string): Promise<string> {
  const client = await rulesAuth.getClient();
  const created = await client.request<{name: string}>({
    url: `${RULES_API}/projects/${projectId}/rulesets`,
    method: "POST",
    data: {
      source: {files: [{name: "storage.rules", content: STORAGE_LOCKDOWN_RULES}]},
    },
  });
  await client.request({
    url: `${RULES_API}/${releaseName}`,
    method: "PATCH",
    data: {
      release: {name: releaseName, rulesetName: created.data.name},
      updateMask: "ruleset_name",
    },
  });
  return created.data.name;
}

/**
 * When the billing budget is fully spent, publishes a ruleset that denies all
 * Cloud Storage writes. Reads, Auth, Realtime Database and notifications keep
 * working, so the app degrades instead of going dark.
 *
 * Setup, all one-time:
 * 1. Create a Cloud Billing budget for the project and attach the
 *    BILLING_ALERT_TOPIC Pub/Sub topic to it under Manage notifications.
 * 2. Grant this function's runtime service account roles/firebaserules.admin,
 *    otherwise the Rules API calls fail with 403.
 *
 * To recover, run `firebase deploy --only storage` to republish the real
 * rules from storage.rules. This function detects the lockdown ruleset is
 * already live and stops re-publishing, which matters because Firebase caps
 * a project at 500 rulesets.
 */
export const disableStorageWritesOnBillingAlert = onMessagePublished(
    BILLING_ALERT_TOPIC,
    async (event) => {
      const notification = parseExceededBudgetNotification(event.data?.message?.data);
      if (!notification) {
        return;
      }

      const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
      if (!projectId) {
        logger.error("Project ID unavailable; cannot lock down storage writes.");
        return;
      }

      logger.warn("Billing budget spent, locking down storage writes", {
        budgetDisplayName: notification.budgetDisplayName,
        costAmount: notification.costAmount,
        budgetAmount: notification.budgetAmount,
      });

      try {
        const release = await getStorageRulesRelease(projectId);
        const currentSource = await getRulesetSource(release.rulesetName);
        if (currentSource.trim() === STORAGE_LOCKDOWN_RULES.trim()) {
          logger.info("Storage writes are already locked down.", {rulesetName: release.rulesetName});
          return;
        }

        const rulesetName = await publishStorageLockdown(projectId, release.name);
        logger.warn("Storage writes locked down.", {
          releaseName: release.name,
          rulesetName,
          replacedRulesetName: release.rulesetName,
        });
      } catch (err) {
        logger.error("Failed to lock down storage writes", err);
        throw err;
      }
    }
);

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
