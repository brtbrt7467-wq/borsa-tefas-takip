import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  inMemoryPersistence,
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut,
  Auth
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Safe Auth initialization with STRICT inMemoryPersistence to prevent Safari / WebKit "Database is closed/hidden" (IndexedDB) errors in standalone PWA / Home Screen mode
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: inMemoryPersistence
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
  login_hint: 'ykefal@gmail.com'
});

const TOKEN_KEY = 'bist_google_sheets_access_token';
const TOKEN_TIME_KEY = 'bist_google_sheets_token_timestamp';
const USER_KEY = 'bist_google_sheets_user_info';

let cachedAccessToken: string | null = null;
let cachedUserInfo: any = null;

export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isSafariPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isIOS = isIOSDevice();
  const isStandalone = (window.navigator as any).standalone === true || 
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
  return isIOS && isStandalone;
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    const timeStr = localStorage.getItem(TOKEN_TIME_KEY);
    if (saved && timeStr) {
      const savedTime = parseInt(timeStr, 10);
      // Access tokens are valid for 55 minutes
      if (Date.now() - savedTime < 55 * 60 * 1000) {
        cachedAccessToken = saved;
        return saved;
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_TIME_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  } catch (e) {
    // storage not available
  }
  return null;
};

export const getCachedUserInfo = (): any => {
  if (cachedUserInfo) return cachedUserInfo;
  try {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      cachedUserInfo = JSON.parse(saved);
      return cachedUserInfo;
    }
  } catch (e) {}
  return null;
};

export const setCachedAuth = (token: string | null, user: any = null) => {
  cachedAccessToken = token;
  cachedUserInfo = user;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_TIME_KEY, Date.now().toString());
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify({
          displayName: user.displayName || user.name || 'Google Kullanıcısı',
          email: user.email || '',
          photoURL: user.photoURL || user.picture || ''
        }));
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_TIME_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch (e) {}
};

/**
 * Initialize auth state listener
 */
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  const token = getCachedAccessToken();
  const user = getCachedUserInfo();

  if (token && user) {
    if (onAuthSuccess) onAuthSuccess(user, token);
  }

  try {
    return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const curToken = getCachedAccessToken();
        if (curToken) {
          if (onAuthSuccess) onAuthSuccess(firebaseUser, curToken);
        }
      }
    });
  } catch (e) {
    console.warn('[GoogleAuth] onAuthStateChanged ignored:', e);
    return () => {};
  }
};

/**
 * Perform Google Sign-In using Google Identity Services (GSI) Token Client
 * completely bypassing IndexedDB to prevent "Database is closed/hidden" errors.
 * Forces account selection so the user can explicitly choose ykefal@gmail.com.
 */
export const googleSignIn = async (options?: { 
  forceSelectAccount?: boolean; 
  loginHint?: string 
}): Promise<{ user: any; accessToken: string }> => {
  const targetHint = options?.loginHint || 'ykefal@gmail.com';
  // Method 1: Google Identity Services (GSI) Token Client - zero IndexedDB
  const gClient = (window as any).google?.accounts?.oauth2;
  const clientId = firebaseConfig.oAuthClientId;

  if (gClient && clientId) {
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = gClient.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          prompt: 'select_account',
          hint: targetHint,
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('[GSI] Auth error:', tokenResponse);
              return reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google yetkilendirme hatası'));
            }

            const accessToken = tokenResponse.access_token;
            if (!accessToken) {
              return reject(new Error('Google erişim jetonu alınamadı.'));
            }

            // Fetch user info from Google userinfo API
            let userObj: any = {
              displayName: 'Google Kullanıcısı',
              email: '',
              photoURL: ''
            };

            try {
              const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (uRes.ok) {
                const uData = await uRes.json();
                userObj = {
                  displayName: uData.name || uData.given_name || 'Google Kullanıcısı',
                  email: uData.email || '',
                  photoURL: uData.picture || ''
                };
              }
            } catch (uErr) {
              console.warn('[GSI] userinfo fetch failed:', uErr);
            }

            setCachedAuth(accessToken, userObj);
            resolve({ user: userObj, accessToken });
          },
          error_callback: (err: any) => {
            console.error('[GSI] Token client error:', err);
            reject(new Error(err?.message || 'Google oturum açma penceresi açılamadı.'));
          }
        });

        tokenClient.requestAccessToken({ 
          prompt: 'select_account',
          hint: targetHint
        });
      } catch (err: any) {
        console.error('[GSI] Exception in token client:', err);
        // Fallback to Firebase Auth
        fallbackFirebasePopup(resolve, reject, options);
      }
    });
  }

  // Method 2: Fallback to Firebase in-memory popup
  return new Promise((resolve, reject) => {
    fallbackFirebasePopup(resolve, reject, options);
  });
};

async function fallbackFirebasePopup(
  resolve: (val: { user: any; accessToken: string }) => void, 
  reject: (err: any) => void,
  options?: { forceSelectAccount?: boolean; loginHint?: string }
) {
  try {
    provider.setCustomParameters({
      prompt: 'select_account',
      login_hint: options?.loginHint || 'ykefal@gmail.com'
    });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Google yetkilendirme jetonu alınamadı.');
    }

    const userObj = {
      displayName: result.user.displayName || 'Google Kullanıcısı',
      email: result.user.email || '',
      photoURL: result.user.photoURL || ''
    };

    setCachedAuth(credential.accessToken, userObj);
    resolve({ user: userObj, accessToken: credential.accessToken });
  } catch (error: any) {
    console.error('[GoogleAuth] Firebase popup error:', error);
    const errMsg = error?.message || '';
    if (errMsg.toLowerCase().includes('database is closed') || errMsg.toLowerCase().includes('hidden')) {
      reject(new Error('Safari kısıtlaması nedeniyle veritabanına erişilemedi. Lütfen sayfayı yenileyip tekrar deneyin veya alternatif yedekleme yöntemlerini kullanın.'));
    } else {
      reject(error);
    }
  }
}

export const switchGoogleAccount = async (targetEmail: string = 'ykefal@gmail.com'): Promise<{ user: any; accessToken: string }> => {
  await googleSignOut();
  return googleSignIn({ forceSelectAccount: true, loginHint: targetEmail });
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('[GoogleAuth] SignOut error:', e);
  }
  setCachedAuth(null, null);
};


