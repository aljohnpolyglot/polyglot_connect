// src/js/constants/appConstants.ts
export const USAGE_LIMITS = {
    free: {
      textMessages: 50,
      voiceCalls: 5,
    },
    premium: {
      textMessages: Infinity, // Or a very large number like 1_000_000
      voiceCalls: Infinity,
    }
  };