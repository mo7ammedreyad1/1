import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC07Gs8L5vxlUmC561PKbxthewA1mrxYDk",
  authDomain: "zylos-test.firebaseapp.com",
  databaseURL: "https://zylos-test-default-rtdb.firebaseio.com",
  projectId: "zylos-test",
  storageBucket: "zylos-test.firebasestorage.app",
  messagingSenderId: "553027007913",
  appId: "1:553027007913:web:2daa37ddf2b2c7c20b00b8"
}

// Enable CORS for all routes
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', '*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Helper function to interact with Firebase Realtime Database
async function firebaseRequest(path, method = 'GET', data = null) {
  const url = `${firebaseConfig.databaseURL}${path}.json`
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  }
  
  if (data) {
    options.body = JSON.stringify(data)
  }
  
  const response = await fetch(url, options)
  return await response.json()
}

// Helper function to generate simple token (for demo purposes)
function generateToken(userId) {
  return btoa(JSON.stringify({
    userId,
    timestamp: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }))
}

// Helper function to hash password (simple demo - use proper hashing in production)
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Routes
app.get('/', (c) => {
  return c.json({ 
    message: 'Hono Firebase Auth Server is running!',
    endpoints: {
      signup: 'POST /api/signup',
      login: 'POST /api/login',
      profile: 'GET /api/profile',
      users: 'GET /api/users'
    }
  })
})

// Sign up endpoint
app.post('/api/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400)
    }
    
    // Check if user already exists
    const existingUsers = await firebaseRequest('/users')
    if (existingUsers) {
      const userExists = Object.values(existingUsers).some(user => user.email === email)
      if (userExists) {
        return c.json({ error: 'User already exists' }, 409)
      }
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password)
    
    // Create user data
    const userData = {
      email,
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString(),
      lastLogin: null
    }
    
    // Save user to Firebase
    const result = await firebaseRequest('/users', 'POST', userData)
    
    if (result && result.name) {
      const token = generateToken(result.name)
      return c.json({
        success: true,
        message: 'User created successfully',
        user: {
          id: result.name,
          email,
          name
        },
        token
      })
    } else {
      return c.json({ error: 'Failed to create user' }, 500)
    }
    
  } catch (error) {
    console.error('Signup error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Login endpoint
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }
    
    // Get all users from Firebase
    const users = await firebaseRequest('/users')
    
    if (!users) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    // Find user by email
    const userEntry = Object.entries(users).find(([id, user]) => user.email === email)
    
    if (!userEntry) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    const [userId, userData] = userEntry
    
    // Verify password
    const hashedPassword = await hashPassword(password)
    if (userData.password !== hashedPassword) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    // Update last login
    await firebaseRequest(`/users/${userId}`, 'PATCH', {
      lastLogin: new Date().toISOString()
    })
    
    const token = generateToken(userId)
    
    return c.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userId,
        email: userData.email,
        name: userData.name,
        lastLogin: userData.lastLogin
      },
      token
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get user profile endpoint
app.get('/api/profile/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    const userData = await firebaseRequest(`/users/${userId}`)
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    // Remove password from response
    const { password, ...userProfile } = userData
    
    return c.json({
      success: true,
      user: {
        id: userId,
        ...userProfile
      }
    })
    
  } catch (error) {
    console.error('Profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get all users endpoint (for testing)
app.get('/api/users', async (c) => {
  try {
    const users = await firebaseRequest('/users')
    
    if (!users) {
      return c.json({ success: true, users: [] })
    }
    
    // Remove passwords from response
    const usersList = Object.entries(users).map(([id, user]) => {
      const { password, ...userWithoutPassword } = user
      return {
        id,
        ...userWithoutPassword
      }
    })
    
    return c.json({
      success: true,
      users: usersList
    })
    
  } catch (error) {
    console.error('Users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    firebase: {
      projectId: firebaseConfig.projectId,
      databaseURL: firebaseConfig.databaseURL
    }
  })
})

export default app