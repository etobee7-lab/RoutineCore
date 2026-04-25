import { API_URLS, fetchAPI } from '../services/api';

export const useNotifications = () => {
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUserToPush = async (username) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications are not supported in this browser.');
      return;
    }

    try {
      if (!window.Notification || !window.Notification.requestPermission) {
        console.warn('Notification API not available.');
        return;
      }

      let permission;
      try {
        const promiseRes = window.Notification.requestPermission();
        if (promiseRes && promiseRes.then) {
          permission = await promiseRes;
        } else {
          permission = await new Promise((resolve) => {
            window.Notification.requestPermission(resolve);
          });
        }
      } catch (e) {
        console.error("Permission request error", e);
        return;
      }

      if (permission !== 'granted') {
        console.log('Notification permission denied.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('BHQBElHGuk1fdr1WwVk0fcc2KbUBVS9L-tRysmha6cLuUGLFUF3g7SoINdxeWDzhcyCgOOLdyG7iRj2WcZO9Qew')
      };

      const subscription = await registration.pushManager.subscribe(subscribeOptions);
      console.log('Push Subscribed:', subscription);

      await fetchAPI(API_URLS.PUSH_SUBSCRIBE, {
        method: 'POST',
        body: JSON.stringify({ username, subscription })
      });
    } catch (err) {
      console.error('Push Subscription failed:', err);
    }
  };

  return { subscribeUserToPush };
};
