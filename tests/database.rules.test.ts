import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestContext } from '@firebase/rules-unit-testing';
import { beforeAll, afterAll, describe, beforeEach, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: any;

const TEST_UID = 'test-user-123';
const OTHER_UID = 'other-user-456';
const TEST_GROUP_ID = 'test-group-123';
const TEST_HANGOUT_ID = 'test-hangout-123';
const TEST_GROUP_ADMIN_UID = 'test-group-admin-123';
const TEST_GROUP_MEMBER_UID = 'test-group-member-123';


beforeAll(async () => {
    const rules = fs.readFileSync(path.join(__dirname, '../database.rules.json'), 'utf8');
    testEnv = await initializeTestEnvironment({
        projectId: 'chill-app-dev',
        database: {
            rules,
            host: 'localhost',
            port: 9000,
        },
    });
});

afterAll(async () => {
    if (testEnv) {
        await testEnv.cleanup();
    }
});

describe('User collection rules', () => {
    beforeEach(async () => {
        testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
            const db = context.database();
            const userRef = db.ref(`users/${TEST_UID}`);
            await userRef.set({
                name: 'Test User',
                createdAt: Date.now()
            });
            const otherUserRef = db.ref(`users/${OTHER_UID}`);
            await otherUserRef.set({
                name: 'Other User',
                createdAt: Date.now()
            });
        });
    });

    it('should not allow reading /users', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const userRef = db.ref('users');
        await assertFails(userRef.once('value'));
    });

    it('should not allow writing /users', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const userRef = db.ref('users');
        await assertFails(userRef.set({ name: 'Test User' }));
    });
    
    it('should allow user to read their own data', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const userRef = db.ref(`users/${TEST_UID}`);
        await assertSucceeds(userRef.once('value'));
    });
    
    it('should not allow user to read other user data', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const otherUserRef = db.ref(`users/${OTHER_UID}`);
        await assertFails(otherUserRef.once('value'));
    });

    it('should allow user to write their own data', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const userRef = db.ref(`users/${TEST_UID}`);
        await assertSucceeds(userRef.set({ name: 'My New Name' }));
    });

    it('should not allow user to write other user data', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const otherUserRef = db.ref(`users/${OTHER_UID}`);
        await assertFails(otherUserRef.set({ name: 'Other User' }));
    });

    it('should allow user to read other user\'s name', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const otherUserRef = db.ref(`users/${OTHER_UID}/name`);
        await assertSucceeds(otherUserRef.once('value'));
    });
    
});

describe('Group collection rules', () => {
    beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
            const db = context.database();
            const groupRef = db.ref(`groups/${TEST_GROUP_ID}`);
            await groupRef.set({
                name: 'Test Group',
                createdAt: Date.now(),
                members: {
                    [TEST_GROUP_ADMIN_UID]: true,
                    [TEST_GROUP_MEMBER_UID]: true
                },
                admins: {
                    [TEST_GROUP_ADMIN_UID]: true
                }
            });

            const groupAdminRef = db.ref(`users/${TEST_GROUP_ADMIN_UID}`);
            await groupAdminRef.set({
                name: 'Test Group Admin',
                createdAt: Date.now()
            });

            const groupMemberRef = db.ref(`users/${TEST_GROUP_MEMBER_UID}`);
            await groupMemberRef.set({
                name: 'Test Group Member',
                createdAt: Date.now()
            });

            const unrelatedUserRef = db.ref(`users/${OTHER_UID}`);
            await unrelatedUserRef.set({
                name: 'Unrelated User',
                createdAt: Date.now()
            });
        });
    });

    it('should not allow reading /groups', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const groupRef = db.ref('groups');
        await assertFails(groupRef.once('value'));
    });

    it('should not allow writing /groups', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const groupRef = db.ref('groups');
        await assertFails(groupRef.set({ name: 'Test Group' }));
    });

    it('should not allow unauthenticated users to read /groups', async () => {
        const context = testEnv.unauthenticatedContext();
        const db = context.database();
        const groupRef = db.ref('groups');
        await assertFails(groupRef.once('value'));
    });
    
    it('should allow users to create a group', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const newGroupRef = db.ref('groups');
        await assertSucceeds(newGroupRef.push({
            name: 'Test Group',
            createdAt: Date.now(),
            members: {
                [TEST_UID]: true,
            },
            admins: {
                [TEST_UID]: true
            }
        }));
    });

    it('should enforce the group schema', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const groupRef = db.ref('groups/new-test-group-123');

        // Should fail - missing required fields
        await assertFails(groupRef.set({}));
        await assertFails(groupRef.set({ name: 'Test Group' }));
        await assertFails(groupRef.set({ 
            name: 'Test Group',
            createdAt: Date.now()
        }));
        await assertFails(groupRef.set({ 
            name: 'Test Group',
            createdAt: Date.now(),
            members: { [TEST_UID]: true }
        }));

        // Should fail - invalid data types
        await assertFails(groupRef.set({ 
            name: 123, // name should be string
            createdAt: Date.now(),
            members: { [TEST_UID]: true },
            admins: { [TEST_UID]: true }
        }));
        await assertFails(groupRef.set({ 
            name: 'Test Group',
            createdAt: 'not a number', // createdAt should be number
            members: { [TEST_UID]: true },
            admins: { [TEST_UID]: true }
        }));
        await assertFails(groupRef.set({ 
            name: 'Test Group',
            createdAt: Date.now(),
            members: { [TEST_UID]: 'not a boolean' }, // should be boolean
            admins: { [TEST_UID]: true }
        }));
        await assertFails(groupRef.set({ 
            name: 'Test Group',
            createdAt: Date.now(),
            members: { [TEST_UID]: true },
            admins: { [TEST_UID]: 'not a boolean' } // should be boolean
        }));

        // Should succeed - all required fields with correct types
        await assertSucceeds(groupRef.set({ 
            name: 'Test Group',
            createdAt: Date.now(),
            members: { [TEST_UID]: true },
            admins: { [TEST_UID]: true }
        }));
    });

    it('should not allow non-admins to edit a group', async () => {
        const context = testEnv.authenticatedContext(OTHER_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}`);
        await assertFails(groupRef.update({ name: 'New Group Name' }));
    });

    it('should allow admins to edit a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_ADMIN_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}`);
        await assertSucceeds(groupRef.update({ name: 'New Group Name' }));
    });

    it('should not allow non-admins to delete a group', async () => {
        const context = testEnv.authenticatedContext(OTHER_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}`);
        await assertFails(groupRef.remove());
    });

    it('should allow admins to delete a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_ADMIN_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}`);
        await assertSucceeds(groupRef.remove());
    });
    
    // TODO: Consider a system where only admins can add users to a group
    it('should allow users to add themselves to a group', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/members/${TEST_UID}`);
        await assertSucceeds(groupRef.set(true));
    });
    
    it('should not allow users to add other users to a group', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/members/${OTHER_UID}`);
        await assertFails(groupRef.set(true));
    });

    it('should not allow unauthenticated users to add users to a group', async () => {
        const context = testEnv.unauthenticatedContext();
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/members/${TEST_UID}`);
        await assertFails(groupRef.set(true));
    });
    
    it('should allow users to remove themselves from a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/members/${TEST_GROUP_MEMBER_UID}`);
        await assertSucceeds(groupRef.remove());
    });
    
    it('should not allow users to remove other users from a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/members/${TEST_GROUP_ADMIN_UID}`);
        await assertFails(groupRef.remove());
    });

    it('should enforce that the members in the group are boolean values', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_ADMIN_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/members/${TEST_GROUP_MEMBER_UID}`);
        await assertFails(groupRef.set('not a boolean'));
    });
    
    it('should allow admins to add admins to a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_ADMIN_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/admins/${TEST_UID}`);
        await assertSucceeds(groupRef.set(true));
    });

    it('should not allow non-admins to add admins to a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/admins/${TEST_UID}`);
        await assertFails(groupRef.set(true));
    });

    it('should allow admins to remove admins from a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_ADMIN_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/admins/${TEST_UID}`);
        await assertSucceeds(groupRef.set(true));
        await assertSucceeds(groupRef.remove());
    });
    
    it('should not allow non-admins to remove admins from a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/admins/${TEST_GROUP_ADMIN_UID}`);
        await assertFails(groupRef.remove());
    });

    it('should enforce that the admins in the group are boolean values', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_ADMIN_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/admins/${TEST_GROUP_MEMBER_UID}`);
        await assertFails(groupRef.set('not a boolean'));
    });

    it('should allow group members to add hangouts to a group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/hangouts/${TEST_HANGOUT_ID}`);
        await assertSucceeds(groupRef.set(true));
    });

    it('should enforce that the hangouts in the group are boolean values', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const groupRef = db.ref(`groups/${TEST_GROUP_ID}/hangouts/${TEST_HANGOUT_ID}`);
        await assertFails(groupRef.set('not a boolean'));
    });
});

describe('Hangout collection rules', () => {
    beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
            const db = context.database();
            const groupRef = db.ref(`groups/${TEST_GROUP_ID}`);
            await groupRef.set({
                name: 'Test Group',
                createdAt: Date.now(),
                members: {
                    [TEST_GROUP_ADMIN_UID]: true,
                    [TEST_GROUP_MEMBER_UID]: true
                },
                admins: {
                    [TEST_GROUP_ADMIN_UID]: true
                }
            });

            const groupAdminRef = db.ref(`users/${TEST_GROUP_ADMIN_UID}`);
            await groupAdminRef.set({
                name: 'Test Group Admin',
                createdAt: Date.now()
            });

            const groupMemberRef = db.ref(`users/${TEST_GROUP_MEMBER_UID}`);
            await groupMemberRef.set({
                name: 'Test Group Member',
                createdAt: Date.now()
            });

            const unrelatedUserRef = db.ref(`users/${OTHER_UID}`);
            await unrelatedUserRef.set({
                name: 'Unrelated User',
                createdAt: Date.now()
            });

            const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}`);
            await hangoutRef.set({
                name: 'Test Hangout',
                createdAt: Date.now(),
                group: TEST_GROUP_ID,
                createdBy: TEST_GROUP_MEMBER_UID,
                createdAnonymously: false
            });
        });
    });

    it('should not allow reading /hangouts', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const hangoutRef = db.ref('hangouts');
        await assertFails(hangoutRef.once('value'));
    });

    it('should not allow writing /hangouts', async () => {
        const context = testEnv.authenticatedContext(TEST_UID);
        const db = context.database();
        const hangoutRef = db.ref('hangouts');
        await assertFails(hangoutRef.set({ name: 'Test Hangout' }));
    });
    
    it('should allow group members to read the hangouts in their group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}`);
        await assertSucceeds(hangoutRef.once('value'));
    });

    it('should not allow users outside of the group to read the hangouts in the group', async () => {
        const context = testEnv.authenticatedContext(OTHER_UID);
        const db = context.database();
        const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}`);
        await assertFails(hangoutRef.once('value'));
    });

    it('should allow group members to create a hangout in their group', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const hangoutRef = db.ref('hangouts/new-hangout-123');
        await assertSucceeds(hangoutRef.set({ name: 'New Test Hangout',
            createdAt: Date.now(),
            group: TEST_GROUP_ID,
            createdBy: TEST_GROUP_MEMBER_UID,
            createdAnonymously: false
        }));
    });
    
    it('should not allow users outside of the group to create a hangout in the group', async () => {
        const context = testEnv.authenticatedContext(OTHER_UID);
        const db = context.database();
        const hangoutRef = db.ref('hangouts/new-hangout-123');
        await assertFails(hangoutRef.set({ name: 'New Test Hangout',
            createdAt: Date.now(),
            group: TEST_GROUP_ID,
            createdBy: OTHER_UID,
            createdAnonymously: false
        }));
    });
    
    it('should allow group members to edit certain fields of a hangout', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}`);

        // Should succeed - editing allowed fields
        await assertSucceeds(hangoutRef.update({ name: 'Edited Test Hangout' }));
        await assertSucceeds(hangoutRef.update({ createdAt: Date.now() }));

        // Should fail - editing protected fields
        await assertFails(hangoutRef.update({ group: 'new-group-id' }));
        await assertFails(hangoutRef.update({ createdBy: OTHER_UID }));
        await assertFails(hangoutRef.update({ createdAnonymously: true }));

        // Should fail - editing allowed fields along with protected fields
        await assertFails(hangoutRef.update({
            name: 'New Name',
            group: 'new-group-id'  // This should cause the entire update to fail
        }));
    });

    it('should allow the creator of the hangout to delete it', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}`);
        await assertSucceeds(hangoutRef.remove());
    });

    it('should not allow other group members, aside from the creator, to delete the hangout', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_ADMIN_UID);
        const db = context.database();
        const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}`);
        await assertFails(hangoutRef.remove());
    });
    
    it('should allow group members to add themselves as an attendee to a hangout', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}/attendees/${TEST_GROUP_MEMBER_UID}`);
        await assertSucceeds(hangoutRef.set(true));
    });

    it('should not allow group members to add other group members as an attendee to a hangout', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_MEMBER_UID);
        const db = context.database();
        const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}/attendees/${TEST_GROUP_ADMIN_UID}`);
        await assertFails(hangoutRef.set(true));
    });
    
    it('should not allow group members to add others as attendees to a hangout', async () => {
        const context = testEnv.authenticatedContext(TEST_GROUP_ADMIN_UID);
        const db = context.database();
        const hangoutRef = db.ref(`hangouts/${TEST_HANGOUT_ID}/attendees/${TEST_GROUP_MEMBER_UID}`);
        await assertFails(hangoutRef.set(true));
    });
    
});
