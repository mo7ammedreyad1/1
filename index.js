import { Hono } from 'hono';

const app = new Hono();

// Firebase REST API configuration
const FIREBASE_AUTH_API = 'https://identitytoolkit.googleapis.com/v1/accounts';
const API_KEY = 'AIzaSyC07Gs8L5vxlUmC561PKbxthewA1mrxYDk';

// CORS Middleware
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  
  await next();
});

// Signup Route
app.post('/signup', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const response = await fetch(`${FIREBASE_AUTH_API}:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return c.json({ error: data.error.message }, 400);
    }
    
    return c.json({
      message: 'Signup successful',
      user: {
        uid: data.localId,
        email: data.email,
        token: data.idToken
      }
    });
  } catch (error) {
    return c.json({ error: 'Server error' }, 500);
  }
});

// Login Route
app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const response = await fetch(`${FIREBASE_AUTH_API}:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return c.json({ error: data.error.message }, 400);
    }
    
    return c.json({
      message: 'Login successful',
      user: {
        uid: data.localId,
        email: data.email,
        token: data.idToken
      }
    });
  } catch (error) {
    return c.json({ error: 'Server error' }, 500);
  }
});

export default app;