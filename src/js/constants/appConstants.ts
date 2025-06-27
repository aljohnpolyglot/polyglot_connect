// IN: appConstants.ts

export const USAGE_LIMITS = {
  free: {
    textMessages: 50,
    voiceCalls: 5,
    imageStorage: 0, // 0 means temporary stored in Firestore, but reloaded once subscribed
    customAchievements:false
  },
  premium: {
    textMessages: Infinity,
    voiceCalls: Infinity,
    dossierAccess: true,
    imageStorage: Infinity, // Permanent storage
    customAchievements: true

  }
};