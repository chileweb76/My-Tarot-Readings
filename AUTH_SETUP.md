# My Tarot Readings - Authentication Setup

This application now includes complete user authentication with MongoDB, including local registration/login and Google OAuth integration.

## Features Implemented

### ✅ User Authentication System
- **User Registration**: Email, username, password with confirmation
- **User Login**: Email and password authentication
- **Google OAuth**: Sign in with Google account
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: Bcrypt for secure password storage
- **MongoDB Integration**: User data stored in MongoDB Atlas

### ✅ User Schema
- Username (auto-generated from Google name for OAuth users)
- Email
- Password (for local auth only)
- Google ID (for OAuth users)
- Profile picture
- Authentication provider (local/google)
- Email verification status
- Readings count
- Timestamps

## Setup Instructions

### 1. Database Configuration
The MongoDB connection is already configured in your `.env` file. The User collection will be created automatically.

### 2. Environment Variables
Update the following in `/server/.env`:

```bash
# Required for JWT authentication
JWT_SECRET=MyTarotReadings_SuperSecret_JWT_Key_12345_ChangeMeInProduction

# Required for session management
SESSION_SECRET=your-session-secret-change-this-too-67890

# Client URL for CORS
CLIENT_URL=http://localhost:3000
```

### 3. Google OAuth Setup (Optional)
To enable Google Sign In:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:50001/api/auth/google/callback`
     - Add your production URL when deploying
5. **Add credentials to `.env`**:
   ```bash
   GOOGLE_CLIENT_ID=your-actual-google-client-id
   GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
   ```

### 4. Testing the Authentication

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Access the auth page**: http://localhost:3000/auth

3. **Test Registration**:
   - Switch to "Register" tab
   - Fill in email, username, password, verify password
   - Click "Create Account"

4. **Test Login**:
   - Switch to "Sign In" tab
   - Use registered email and password
   - Click "Sign In"

5. **Test Google OAuth** (if configured):
   - Click "Sign in with Google"
   - Complete Google authentication flow

## API Endpoints

### Authentication Routes
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user (requires token)
- `POST /api/auth/logout` - Logout user

### Example API Usage

#### Register User
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123',
    verifyPassword: 'password123'
  })
})
```

#### Login User
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123'
  })
})
```

#### Access Protected Routes
```javascript
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
```

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure token generation with expiration
- **Input Validation**: Server-side validation for all inputs
- **CORS Configuration**: Proper cross-origin setup
- **Environment Variables**: Sensitive data in environment files
- **Unique Constraints**: Email and username uniqueness enforced

## Google Sign In Username Generation

When users sign in with Google:
1. The display name is converted to a username (lowercase, alphanumeric only)
2. If username exists, a number is appended (e.g., "john1", "john2")
3. Minimum 2 characters required
4. Maximum 20 characters for base username

## Next Steps

1. **Set up Google OAuth credentials** (optional)
2. **Test the authentication flow**
3. **Integrate authentication with other app features**
4. **Add protected routes for tarot readings**
5. **Implement user dashboard/profile pages**

## Troubleshooting

- **Server not starting**: Check if all dependencies are installed (`npm install`)
- **Google OAuth not working**: Verify client ID and secret in `.env`
- **JWT errors**: Ensure JWT_SECRET is set and not the default placeholder
- **Database connection**: Verify MongoDB URI in `.env`

## Email verification (Courier)

This project can send verification emails using Courier. To enable it:

1. Create an account at https://courier.com and create a new message template for verification emails. Use a variable like `{{verify_url}}` or `{{verifyUrl}}` in the template where the verification link should appear. The server sends both `verify_url` and `verifyUrl` in the template data to maximize compatibility — ensure your template references one of those names.

2. Add the following environment variables to `/server/.env`:

```bash
# Courier API token (send via Authorization: Bearer <token>)
COURIER_AUTH_TOKEN=your-courier-auth-token

# Courier template id created in the Courier dashboard
COURIER_VERIFY_TEMPLATE_ID=your-courier-template-id
```

3. Restart the server. When a user registers, the server will generate a verification token and send an email with a link to:

```
${CLIENT_URL}/auth/verify?token=<token>
```

4. When the user clicks the link, the server will mark `isEmailVerified=true` and redirect to the client success page.

If you prefer another email provider (SendGrid, Postmark, SES), I can adapt the code accordingly.
