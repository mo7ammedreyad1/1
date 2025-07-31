import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Firebase configuration مدمج مباشرة
const firebaseConfig = {
  apiKey: "AIzaSyC07Gs8L5vxlUmC561PKbxthewA1mrxYDk",
  authDomain: "zylos-test.firebaseapp.com",
  databaseURL: "https://zylos-test-default-rtdb.firebaseio.com",
  projectId: "zylos-test",
  storageBucket: "zylos-test.firebasestorage.app",
  messagingSenderId: "553027007913",
  appId: "1:553027007913:web:2daa37ddf2b2c7c20b00b8"
};

// Enable CORS
app.use('*', cors())

// Helper function to make Firebase REST API calls
async function firebaseRequest(endpoint, method, data = null) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${firebaseConfig.apiKey}`;
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Firebase error');
    }
    
    return result;
  } catch (error) {
    throw error;
  }
}

// Helper function to save user data to Realtime Database
async function saveUserToDatabase(userId, email, displayName) {
  const dbUrl = `${firebaseConfig.databaseURL}/users/${userId}.json`;
  
  const userData = {
    email: email,
    displayName: displayName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  
  const response = await fetch(dbUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to save user data');
  }
  
  return userData;
}

// Root route
app.get('/', (c) => {
  return c.json({ 
    message: 'Welcome to Hono Firebase Auth Server',
    endpoints: {
      signup: 'POST /api/signup',
      login: 'POST /api/login',
      user: 'GET /api/user/:userId'
    }
  })
})

// Signup endpoint
app.post('/api/signup', async (c) => {
  try {
    const { email, password, displayName } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    // Create user with Firebase Auth
    const authResult = await firebaseRequest('signUp', 'POST', {
      email,
      password,
      returnSecureToken: true
    });
    
    // Save user data to Realtime Database
    await saveUserToDatabase(authResult.localId, email, displayName);
    
    return c.json({
      success: true,
      user: {
        id: authResult.localId,
        email: authResult.email,
        idToken: authResult.idToken,
        refreshToken: authResult.refreshToken
      }
    });
  } catch (error) {
    return c.json({ 
      error: error.message || 'Signup failed' 
    }, 400);
  }
});

// Login endpoint
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    // Sign in with Firebase Auth
    const authResult = await firebaseRequest('signInWithPassword', 'POST', {
      email,
      password,
      returnSecureToken: true
    });
    
    return c.json({
      success: true,
      user: {
        id: authResult.localId,
        email: authResult.email,
        idToken: authResult.idToken,
        refreshToken: authResult.refreshToken
      }
    });
  } catch (error) {
    return c.json({ 
      error: error.message || 'Login failed' 
    }, 401);
  }
});

// Get user data endpoint
app.get('/api/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const dbUrl = `${firebaseConfig.databaseURL}/users/${userId}.json`;
    
    const response = await fetch(dbUrl);
    
    if (!response.ok) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const userData = await response.json();
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({
      success: true,
      user: userData
    });
  } catch (error) {
    return c.json({ 
      error: error.message || 'Failed to fetch user data' 
    }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export default app