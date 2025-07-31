import { Hono } from 'hono';

// Your web app's Firebase configuration (أضفته مباشرة كما طلبت)
const firebaseConfig = {
  apiKey: "AIzaSyC07Gs8L5vxlUmC561PKbxthewA1mrxYDk",
  authDomain: "zylos-test.firebaseapp.com",
  databaseURL: "https://zylos-test-default-rtdb.firebaseio.com",
  projectId: "zylos-test",
  storageBucket: "zylos-test.firebasestorage.app",
  messagingSenderId: "553027007913",
  appId: "1:553027007913:web:2daa37ddf2b2c7c20b00b8"
};

const app = new Hono();

app.post('/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    // Signup using Firebase Auth REST API
    const signupResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const signupData = await signupResponse.json();
    if (!signupResponse.ok) {
      return c.json({ error: signupData.error.message }, 400);
    }

    const uid = signupData.localId;
    const idToken = signupData.idToken;

    // Store user data in Realtime Database using REST API (with idToken for auth)
    const dbUrl = `${firebaseConfig.databaseURL}/users/${uid}.json?auth=${idToken}`;
    await fetch(dbUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, createdAt: new Date().toISOString() })
    });

    return c.json({ message: 'Signup successful', uid, token: idToken });
  } catch (error) {
    return c.json({ error: 'Signup failed' }, 500);
  }
});

app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Login using Firebase Auth REST API
    const loginResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      return c.json({ error: loginData.error.message }, 400);
    }

    return c.json({ message: 'Login successful', token: loginData.idToken });
  } catch (error) {
    return c.json({ error: 'Login failed' }, 500);
  }
});

export default {
  fetch: app.fetch
};