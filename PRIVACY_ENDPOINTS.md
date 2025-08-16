# 🔒 Privacy Settings API Endpoints

## 🔐 Authentication
All endpoints require authentication via JWT token in cookies.

---

## 🛡️ **PROFILE PROTECTION**

### **GET /api/users/profile/privacy**
Get current privacy settings and NDA status.

**Example Response:**
```json
{
  "privacy": {
    "profileProtection": true,
    "profileVisibility": "connections",
    "allowMessages": false,
    "showEmail": true,
    "showPhone": false
  },
  "nda": {
    "hasNDA": false,
    "ndaType": "none",
    "ndaFile": "",
    "ndaGeneratedContent": "",
    "ideaProtection": false
  }
}
```

### **PATCH /api/users/profile/privacy**
Update privacy settings.

**Request Body:**
```json
{
  "profileProtection": true,
  "profileVisibility": "connections",
  "allowMessages": false,
  "showEmail": true,
  "showPhone": false
}
```

**Available Settings:**
- `profileProtection` (boolean) - Enable/disable profile protection
- `profileVisibility` (string) - "public", "connections", or "private"
- `allowMessages` (boolean) - Allow others to send messages
- `showEmail` (boolean) - Show email in public profile
- `showPhone` (boolean) - Show phone in public profile

**Example Response:**
```json
{
  "message": "Privacy settings updated successfully.",
  "privacy": {
    "profileProtection": true,
    "profileVisibility": "connections",
    "allowMessages": false,
    "showEmail": true,
    "showPhone": false
  }
}
```

---

## 📄 **NDA & IDEA PROTECTION**

### **POST /api/users/profile/nda/upload**
Upload a PDF NDA file.

**Request Body:**
```
Content-Type: multipart/form-data

ndaFile: [PDF file]
```

**Example Response:**
```json
{
  "message": "NDA uploaded successfully.",
  "nda": {
    "hasNDA": true,
    "ndaType": "uploaded",
    "ndaFile": "https://res.cloudinary.com/.../nda_file.pdf",
    "ideaProtection": true
  }
}
```

**Features:**
- Only accepts PDF files
- Uploads to Cloudinary for secure storage
- Automatically enables idea protection
- File validation and cleanup

### **POST /api/users/profile/nda/generate**
Generate a custom NDA document.

**Request Body:**
```json
{
  "companyName": "Tech Innovations Ltd",
  "projectName": "AI-Powered Learning Platform",
  "protectionScope": "all technical specifications, algorithms, and business strategies"
}
```

**Example Response:**
```json
{
  "message": "NDA generated successfully.",
  "nda": {
    "hasNDA": true,
    "ndaType": "generated",
    "ndaGeneratedContent": "NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement...",
    "ndaGeneratedAt": "2025-08-01T20:44:39.668Z",
    "ideaProtection": true
  }
}
```

**Generated NDA Includes:**
- Professional NDA template
- Company and project details
- Custom protection scope
- User's name and date
- Standard legal clauses
- 2-year term period

### **DELETE /api/users/profile/nda**
Remove NDA and disable idea protection.

**Example Response:**
```json
{
  "message": "NDA removed successfully.",
  "nda": {
    "hasNDA": false,
    "ideaProtection": false,
    "ndaFile": "",
    "ndaGeneratedContent": "",
    "ndaType": "none",
    "ndaGeneratedAt": null
  }
}
```

---

## 🧪 **Testing Examples**

### **1. Enable Profile Protection**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/privacy \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "profileProtection": true,
    "profileVisibility": "connections"
  }'
```

### **2. Generate Custom NDA**
```bash
curl -X POST http://localhost:2000/api/users/profile/nda/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "companyName": "My Startup Inc",
    "projectName": "Revolutionary App",
    "protectionScope": "all intellectual property and trade secrets"
  }'
```

### **3. Upload NDA PDF**
```bash
curl -X POST http://localhost:2000/api/users/profile/nda/upload \
  -F "ndaFile=@/path/to/your/nda.pdf" \
  -b cookies.txt
```

### **4. Remove NDA**
```bash
curl -X DELETE http://localhost:2000/api/users/profile/nda \
  -b cookies.txt
```

---

## 📋 **Privacy Settings Overview**

### **Profile Protection Levels:**
- **Public** - Profile visible to everyone
- **Connections** - Only visible to connected users
- **Private** - Only visible to the user

### **Message Controls:**
- **Allow Messages** - Control who can send messages
- **Profile Protection** - Additional security layer

### **Contact Information:**
- **Show Email** - Display email in public profile
- **Show Phone** - Display phone in public profile

### **NDA Types:**
- **Uploaded** - User uploads their own PDF
- **Generated** - System generates custom NDA
- **None** - No NDA protection

---

## ⚠️ **Error Responses**

### **400 Bad Request**
```json
{
  "message": "Only PDF files are allowed."
}
```

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
  "message": "Error updating privacy settings",
  "error": "Detailed error description"
}
```

---

## 🔄 **Complete Privacy Workflow**

1. **Get current settings:**
   ```
   GET /api/users/profile/privacy
   ```

2. **Enable profile protection:**
   ```
   PATCH /api/users/profile/privacy
   {
     "profileProtection": true,
     "profileVisibility": "connections"
   }
   ```

3. **Generate NDA for idea protection:**
   ```
   POST /api/users/profile/nda/generate
   {
     "companyName": "My Company",
     "projectName": "My Project",
     "protectionScope": "all confidential information"
   }
   ```

4. **Or upload existing NDA:**
   ```
   POST /api/users/profile/nda/upload
   [PDF file upload]
   ```

5. **Remove NDA if needed:**
   ```
   DELETE /api/users/profile/nda
   ```

All privacy endpoints are now ready for frontend integration! 🚀 