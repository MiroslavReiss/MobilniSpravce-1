import OneSignal from '@onesignal/node-onesignal';

if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
  throw new Error('OneSignal credentials not found in environment variables');
}

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

const configuration = OneSignal.createConfiguration({
  appKey: ONESIGNAL_REST_API_KEY,
});

const client = new OneSignal.DefaultApi(configuration);

export async function sendPushNotification(title: string, message: string, userIds: string[]) {
  try {
    const notification = new OneSignal.Notification();
    notification.app_id = ONESIGNAL_APP_ID;
    notification.include_external_user_ids = userIds;
    notification.contents = {
      en: message
    };
    notification.headings = {
      en: title
    };

    const response = await client.createNotification(notification);
    console.log('Push notification sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}
