# 📥 Profile Data Download API Endpoints

## 🔐 Authentication
All endpoints require authentication via JWT token in cookies.

---

## 📊 **PROFILE DATA DOWNLOAD**

### **GET /api/users/profile/download**
Download all user profile data as a secure CSV file.

**Features:**
- ✅ Complete profile data export
- ✅ User's ideas and posts
- ✅ All settings and preferences
- ✅ Account statistics
- ✅ GDPR compliant data export
- ✅ Secure CSV format (no internal structure exposure)
- ✅ Automatic file download
- ✅ User-friendly format

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="profile-data-{firstName}-{date}.csv"
```

**CSV Format Overview:**
The CSV file is organized into 8 clear sections (settings excluded for privacy):

1. **PERSONAL INFORMATION** - Basic profile details
2. **PROFESSIONAL INFORMATION** - Work and education details
3. **ROLES AND SPECIALIZATIONS** - Investor/Mentor status
4. **SOCIAL MEDIA LINKS** - Connected social profiles
5. **ACCOUNT INFORMATION** - Account metadata
6. **IDEAS AND POSTS** - User's content
7. **ACCOUNT STATISTICS** - Analytics and metrics
8. **EXPORT INFORMATION** - Export metadata

**Note:** Settings sections (Privacy, NDA, Notifications, Theme) are excluded for enhanced privacy and security.

**Example CSV Structure:**
```csv
PERSONAL INFORMATION
Field,Value
First Name,Hafiz
Full Name,Hafiz Al Asad
Email,hkkhan074@gmail.com
Phone,+8801645272591
Bio,World is so big nigga
Address,
City,
State,
Country,
Zip Code,

PROFESSIONAL INFORMATION
Field,Value
Company,Tech Ventures Inc
Position,Senior Investment Manager
Experience,10+ years in tech investments
Skills,react; adobe; illustrator
Education,
Resume Link,https://www.drive.google.com
Interested Roles,developer; react; nodejs
Status,active

ROLES AND SPECIALIZATIONS
Field,Value
Is Investor,Yes
Is Mentor,Yes
Investment Focus,AI; FinTech; EdTech
Mentorship Areas,Business Strategy; Product Development; Startup Growth

SOCIAL MEDIA LINKS
Platform,URL
facebook,https://www.facebook.com/ethun.01645
instagram,https://www.instagram.com/ethun.01645

ACCOUNT INFORMATION
Field,Value
Account Created,7/22/2025
Last Updated,8/2/2025
Email Verified,No
Phone Verified,No

IDEAS AND POSTS
Title,Description,Category,Created Date,Last Updated
AI Weed Maker,Use ai to learn the machine to create the joint and sticks,,7/24/2025,7/24/2025
Cooking instantly using ai and hardwares,Bla bla bla bla bla....,,7/24/2025,7/24/2025

ACCOUNT STATISTICS
Metric,Value
Total Ideas,2
Account Age,10 days
Social Media Accounts,2

EXPORT INFORMATION
Field,Value
Exported On,8/2/2025
Export Time,4:20:10 AM
Data Format,CSV
Total Sections,8
Note,Settings and preferences are excluded for privacy and security
```

---

## 🧪 **Testing Examples**

### **1. Download Profile Data (View in Terminal)**
```bash
curl -X GET http://localhost:2000/api/users/profile/download \
  -b cookies.txt
```

### **2. Download Profile Data (Save to File)**
```bash
curl -X GET http://localhost:2000/api/users/profile/download \
  -b cookies.txt \
  -o "my-profile-data.csv"
```

### **3. Download Profile Data (View CSV Content)**
```bash
curl -X GET http://localhost:2000/api/users/profile/download \
  -b cookies.txt \
  -s | head -20
```

---

## 🛡️ **Security Benefits of CSV Format**

### **Why CSV is More Secure:**
- ✅ **No Internal Structure Exposure** - Doesn't reveal database schema
- ✅ **No Internal IDs** - No MongoDB ObjectIds or internal references
- ✅ **No Nested Objects** - Flat structure, easier to read
- ✅ **No Technical Metadata** - No internal field names or types
- ✅ **User-Friendly** - Easy to open in Excel, Google Sheets, or text editors
- ✅ **Standard Format** - Widely supported across applications
- ✅ **Human Readable** - Clear section headers and field names

### **Data Protection:**
- ✅ Authentication required
- ✅ User can only download their own data
- ✅ No sensitive internal structure exposure
- ✅ GDPR compliant export format
- ✅ Sanitized and escaped content

---

## 📋 **CSV Sections Overview**

### **1. Personal Information:**
- Basic profile details (name, email, phone)
- Bio and address information
- Clean, readable format

### **2. Professional Information:**
- Company and position details
- Experience and skills (semicolon-separated)
- Education and resume information

### **3. Roles & Specializations:**
- Investor/Mentor status (Yes/No)
- Focus areas (semicolon-separated)

### **4. Social Media Links:**
- Platform names and URLs
- Clean table format

### **5. Account Information:**
- Account creation and update dates
- Verification status
- Clean date formatting

### **6. Ideas and Posts:**
- All user's content
- Creation and update dates
- Categories and descriptions

### **7. Statistics:**
- Total ideas count
- Account age in days
- Social media account count

### **8. Export Information:**
- Export timestamp
- Data format information
- Section count
- Privacy note about excluded settings

### **Excluded Sections (for Privacy & Security):**
- ❌ **Privacy Settings** - Profile protection, visibility, contact preferences
- ❌ **NDA Settings** - NDA status, type, and protection settings
- ❌ **Notification Settings** - Email and app notification preferences
- ❌ **Theme Settings** - UI customization and accessibility preferences

---

## 🔄 **Frontend Integration Examples**

### **1. Download Profile Data:**
```javascript
const downloadProfileData = async () => {
  try {
    const response = await fetch('/api/users/profile/download', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to download profile data');
    }
    
    // Get filename from response headers
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
    
    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log('Profile data downloaded successfully!');
  } catch (error) {
    console.error('Error downloading profile data:', error);
  }
};
```

### **2. Download with Progress Indicator:**
```javascript
const downloadProfileDataWithProgress = async () => {
  try {
    setDownloading(true);
    
    const response = await fetch('/api/users/profile/download', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to download profile data');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setDownloading(false);
    
  } catch (error) {
    console.error('Error downloading profile data:', error);
    setDownloading(false);
  }
};
```

### **3. Preview CSV Content:**
```javascript
const previewProfileData = async () => {
  try {
    const response = await fetch('/api/users/profile/download', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile data');
    }
    
    const csvText = await response.text();
    
    // Display CSV content in a modal or new window
    setCsvContent(csvText);
    setShowPreview(true);
    
  } catch (error) {
    console.error('Error fetching profile data:', error);
  }
};
```

### **4. React Component Example:**
```jsx
import React, { useState } from 'react';

const ProfileDownload = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      const response = await fetch('/api/users/profile/download', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="profile-download">
      <h3>Download Your Data</h3>
      <p>Get a complete copy of all your profile data in a secure CSV format.</p>
      
      <button 
        onClick={handleDownload}
        disabled={downloading}
        className="download-btn"
      >
        {downloading ? 'Downloading...' : 'Download Profile Data (CSV)'}
      </button>
      
      <div className="format-info">
        <h4>CSV Format Benefits:</h4>
        <ul>
          <li>✅ Secure - No internal structure exposure</li>
          <li>✅ User-friendly - Opens in Excel/Sheets</li>
          <li>✅ Readable - Clear section headers</li>
          <li>✅ Complete - All your data included</li>
        </ul>
      </div>
    </div>
  );
};

export default ProfileDownload;
```

---

## ⚠️ **Error Responses**

### **401 Unauthorized**
```json
{
  "message": "No token, authorization denied."
}
```

### **404 Not Found**
```json
{
  "message": "User not found."
}
```

### **500 Internal Server Error**
```json
{
  "message": "Error downloading profile data",
  "error": "Detailed error description"
}
```

---

## 📊 **Use Cases**

### **1. Data Portability:**
- Users can export their data to move to other platforms
- GDPR compliance for data access requests
- Backup personal information in readable format

### **2. Account Management:**
- Review all stored information in organized sections
- Verify data accuracy with clear field names
- Prepare for account deletion with complete data

### **3. Analytics:**
- Analyze personal activity patterns
- Review idea creation history
- Track account growth and engagement

### **4. Support:**
- Provide data to customer support in readable format
- Debug account issues with clear data structure
- Verify account status and settings

---

## 🔄 **Complete Download Workflow**

1. **User requests download:**
   ```
   GET /api/users/profile/download
   ```

2. **Server validates authentication:**
   - Check JWT token
   - Verify user exists

3. **Server compiles data:**
   - Fetch user profile
   - Get user's ideas
   - Calculate statistics

4. **Server creates CSV export:**
   - Structure data in 8 clear sections (settings excluded)
   - Escape CSV values properly
   - Add export metadata and privacy note

5. **Client downloads file:**
   - Browser triggers CSV file download
   - User receives readable CSV file
   - File opens in Excel/Sheets/any text editor

The secure CSV profile download endpoint is now ready for production use! 🚀 