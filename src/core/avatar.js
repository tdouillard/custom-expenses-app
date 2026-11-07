export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_SIZE = 512;

/* Storage path of a user's photo. Must match the storage policies in supabase/schema.sql. */
export const avatarPath = (userId) => `${userId}/avatar.jpg`;

/* Returns the translation key of the problem with a picked file, or '' when it can be used. */
export function avatarProblem(file) {
  if (!AVATAR_TYPES.includes(file.type)) return 'account.photoType';
  if (file.size > AVATAR_MAX_BYTES) return 'account.photoSize';
  return '';
}

/* Redraws the picture as a centred square JPEG. Only pixels survive: EXIF and GPS metadata and any
   embedded content are dropped, so the stored file is always a plain image. Rejects if it cannot be decoded. */
export async function toAvatarBlob(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = Object.assign(document.createElement('canvas'), { width: AVATAR_SIZE, height: AVATAR_SIZE });
  canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode'))), 'image/jpeg', 0.88));
}
