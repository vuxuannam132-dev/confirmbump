import axios from 'axios';

// Get or generate persistent device id for current browser
export function getClientDeviceId() {
  let deviceId = localStorage.getItem('confirmbump_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('confirmbump_device_id', deviceId);
  }
  return deviceId;
}

// Get descriptive device name based on User-Agent
export function getClientDeviceName() {
  const ua = navigator.userAgent || '';
  let os = 'Thiết bị';
  if (/iPad|iPhone|iPod/.test(ua)) os = 'Apple iOS (iPhone/iPad)';
  else if (/Android/.test(ua)) os = 'Android Phone';
  else if (/Windows NT 10.0/.test(ua)) os = 'Windows 10/11';
  else if (/Windows/.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'Mac / Apple macOS';
  else if (/Linux/.test(ua)) os = 'Linux PC';

  let browser = 'Trình duyệt';
  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Apple Safari';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';

  return `${browser} (${os})`;
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token and device identification headers to all outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Attach persistent device headers
  try {
    config.headers['x-device-id'] = getClientDeviceId();
    config.headers['x-device-name'] = getClientDeviceName();
  } catch (e) {}

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
