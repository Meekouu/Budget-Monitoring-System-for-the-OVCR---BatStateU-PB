# OVCRDES Budget Monitoring Portal

A modern, real-time budget monitoring web portal for OVCRDES (Office of the Vice Chancellor for Research, Development, and Extension Services) that bridges the gap between Google Sheets and a high-performance dashboard.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Google Apps Script (Sync Engine)
- **Database**: Firebase Firestore (real-time data & caching)
- **Authentication**: Firebase Auth with Google Sign-In
- **Routing**: React Router

### Data Flow
```
Google Sheet (Human Layout) 
    ↓
Google Apps Script (Sync Engine)
    ↓
Firebase Firestore (Normalized Data)
    ↓
React Web App (Real-time Dashboard)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Google Account (for Firebase & Apps Script)
- Access to OVCRDES Budget Google Sheet

### 1. Frontend Setup

```bash
# Clone and install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### 2. Firebase Configuration

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project: `ovcrdes-budget-portal`

2. **Enable Services**
   - Authentication → Sign-in method → Enable Google
   - Firestore Database → Create database in test mode

3. **Get Configuration**
   - Project Settings → General → Your apps → Web app
   - Copy config values to `.env.local`

4. **Configure Security Rules** (Firestore Rules tab):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Authenticated users can read budget data
       match /{document=**} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.token.admin == true;
       }
     }
   }
   ```

### 3. Google Apps Script Setup

1. **Create Apps Script Project**
   - Open your Budget Google Sheet
   - Extensions → Apps Script
   - Copy contents from `google-apps-script/SyncEngine.gs`

2. **Configure Firebase Service Account**
   - Go to Firebase Project Settings → Service accounts
   - Generate new private key
   - In Apps Script: File → Project properties → Script properties
   - Add property: `FIREBASE_SERVICE_ACCOUNT_KEY` with the JSON content

3. **Update Configuration**
   - In `SyncEngine.gs`, update `CONFIG.FIREBASE_PROJECT_ID`
   - Adjust column mappings based on your sheet structure
   - Update campus mappings as needed

4. **Test Sync**
   - Run `testSync()` function in Apps Script editor
   - Check logs for any errors
   - Verify data appears in Firestore

5. **Set Up Triggers**
   - Run `setup()` function to create automatic triggers
   - Or manually: Triggers → Add Trigger → `syncBudgetData` → Time-based → Every 30 minutes

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── BudgetOverview.tsx
│   ├── RecentTransactions.tsx
│   ├── Navbar.tsx
│   └── LoadingSpinner.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── pages/             # Page components
│   ├── Login.tsx
│   └── Dashboard.tsx
├── firebase.ts         # Firebase configuration and types
└── App.tsx            # Main app with routing

google-apps-script/
└── SyncEngine.gs       # Google Apps Script sync engine
```

## 🔧 Configuration

### Sheet Structure Mapping

The sync engine expects this structure (adjust in `CONFIG`):

```
Row 6: Summary data (Balance, BUR, ALOBS totals)
Row 11+: PAPs data table
  Column A: PAPs' Title
  Column B: Proposed Implementation  
  Column C: Campus (dropdown)
  Column D: Consolidated PR
  Column E: Amount Requested
  Column F: Obligated
  Column G: Balance
```

### Environment Variables

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 👥 User Roles

### Admin (OVCRDES Central)
- View all campus data
- Access to reports and exports
- Full dashboard functionality

### Department Users
- View only their assigned campus data
- Limited dashboard views
- Basic reporting access

## 🔄 Sync Process

### Automatic Sync
- Runs every 30 minutes via time trigger
- Parses sheet data into normalized format
- Updates Firestore collections

### Manual Sync
- Run `syncBudgetData()` in Apps Script editor
- Useful for testing or immediate updates

### Data Collections
- `summary_budgets`: High-level budget totals
- `paps`: Individual program/activity/project records
- `campuses`: Campus/department information
- `users`: User roles and permissions

## 🚨 Troubleshooting

### Common Issues

1. **Tailwind CSS not working**
   - Ensure PostCSS is configured correctly
   - Check that `tailwind.config.js` content paths are correct

2. **Firebase connection errors**
   - Verify environment variables are set
   - Check Firebase project configuration
   - Ensure Firestore security rules allow access

3. **Apps Script sync failures**
   - Check service account key configuration
   - Verify Firebase project ID matches
   - Review Apps Script execution logs

4. **Authentication issues**
   - Ensure Google Sign-In is enabled in Firebase
   - Check authorized domains in Firebase Auth settings
   - Verify CORS settings if needed

### Debug Mode

Enable debug logging:
```javascript
// In Apps Script
Logger.log('Debug info: ' + JSON.stringify(data));

// In React app
console.log('Firebase config:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

## 📊 Features

### Current Features
- ✅ Google Sign-In authentication
- ✅ Real-time budget overview cards
- ✅ Campus-wise budget breakdown
- ✅ Recent PAPs (Programs, Activities, Projects)
- ✅ Responsive design with Tailwind CSS
- ✅ Role-based access control
- ✅ Google Apps Script sync engine

### Planned Features
- 📊 Interactive charts and visualizations
- 📈 Budget vs actual spending trends
- 📤 Export to PDF/CSV functionality
- 🔔 Budget alerts and notifications
- 📱 Mobile app (PWA)
- 🔄 Real-time collaboration
- 📋 Advanced filtering and search

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary to OVCRDES. All rights reserved.

## 📞 Support

For technical support:
- IT Department: [contact info]
- Firebase Issues: Check Firebase documentation
- Apps Script Issues: Check Google Apps Script documentation

---

**Note**: This is a production system handling sensitive financial data. Ensure proper security measures and follow university data governance policies.
