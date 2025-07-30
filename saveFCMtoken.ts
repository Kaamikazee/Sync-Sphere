// saveFCMToken.ts
import axios from 'axios';

export const saveFcmToken = async (token: string) => {
  await axios.post('/api/save-fcm-token', { token });
};
