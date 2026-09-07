import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { getStorage, ref, putFile, getDownloadURL, deleteObject } from '@react-native-firebase/storage';

// The profile header renders at 80pt, so 256px stays sharp on 3x screens while
// keeping uploads well under 100KB.
const PROFILE_IMAGE_SIZE = 256;
const JPEG_QUALITY = 0.7;

const userProfileImagePath = (userId: string) => `userProfileImage/${userId}.jpg`;
const groupProfileImagePath = (groupId: string) => `groupProfileImage/${groupId}.jpg`;

export type ProfileImagePhase = 'picking' | 'uploading';

/**
 * Opens the photo library, squares and shrinks the picked image, then uploads
 * it to the given Storage path. Resolves with the download URL, or null when
 * the user backs out of the picker.
 */
async function pickAndUploadProfileImage(
  storagePath: string,
  onPhase?: (phase: ProfileImagePhase) => void,
): Promise<string | null> {
  onPhase?.('picking');
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (picked.canceled || !picked.assets.length) {
    return null;
  }

  // Both dimensions are pinned because the picker already returned a square crop.
  const rendered = await ImageManipulator
    .manipulate(picked.assets[0].uri)
    .resize({ width: PROFILE_IMAGE_SIZE, height: PROFILE_IMAGE_SIZE })
    .renderAsync();
  const resized = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  onPhase?.('uploading');
  const storageRef = ref(getStorage(), storagePath);
  // storage.rules only accepts image/jpeg, so the type has to be explicit.
  await putFile(storageRef, resized.uri, { contentType: 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);
  // Overwrites reuse the same path, so the URL does not change. A cache-bust
  // query param forces Image to fetch the new bytes.
  return `${downloadUrl}&v=${Date.now()}`;
}

export function uploadUserProfileImage(
  userId: string,
  onPhase?: (phase: ProfileImagePhase) => void,
): Promise<string | null> {
  return pickAndUploadProfileImage(userProfileImagePath(userId), onPhase);
}

export function uploadGroupProfileImage(
  groupId: string,
  onPhase?: (phase: ProfileImagePhase) => void,
): Promise<string | null> {
  return pickAndUploadProfileImage(groupProfileImagePath(groupId), onPhase);
}

/**
 * Removes a user's profile image when their account is deleted. A missing
 * object is not worth surfacing, so failures are logged and swallowed.
 */
export async function deleteUserProfileImage(userId: string): Promise<void> {
  try {
    await deleteObject(ref(getStorage(), userProfileImagePath(userId)));
  } catch (error) {
    console.log('Could not delete profile image:', error);
  }
}
