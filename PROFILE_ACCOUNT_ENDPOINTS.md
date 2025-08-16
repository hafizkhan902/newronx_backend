# 👤 Profile & Account Settings API Endpoints

## 🔐 Authentication
All endpoints require authentication via JWT token in cookies.

---

## 📧 **EMAIL MANAGEMENT**

### **PATCH /api/users/profile/email**
Update user's email address.

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "password": "current_password"
}
```

**Example Response:**
```json
{
  "message": "Email updated successfully.",
  "email": "newemail@example.com"
}
```

**Validation:**
- Requires current password verification
- Checks if email already exists
- Converts email to lowercase

---

## 🔒 **PASSWORD MANAGEMENT**

### **PATCH /api/users/profile/password**
Update user's password.

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Example Response:**
```json
{
  "message": "Password updated successfully."
}
```

**Validation:**
- Requires current password verification
- New password must be at least 6 characters
- Password is hashed using bcrypt

---

## 🎯 **ROLE MANAGEMENT**

### **GET /api/users/profile/roles**
Get current user's investor/mentor roles and profile information.

**Example Response:**
```json
{
  "isInvestor": true,
  "isMentor": true,
  "company": "Tech Ventures Inc",
  "position": "Senior Investment Manager",
  "experience": "10+ years in tech investments",
  "investmentFocus": [
    "AI",
    "FinTech",
    "EdTech"
  ],
  "mentorshipAreas": [
    "Business Strategy",
    "Product Development",
    "Startup Growth"
  ]
}
```

### **PATCH /api/users/profile/roles**
Update user's investor/mentor roles and related profile information.

**Request Body:**
```json
{
  "isInvestor": true,
  "isMentor": false,
  "company": "Tech Ventures Inc",
  "position": "Senior Investment Manager",
  "experience": "10+ years in tech investments",
  "investmentFocus": ["AI", "FinTech", "EdTech"],
  "mentorshipAreas": ["Business Strategy", "Product Development"]
}
```

**Example Response:**
```json
{
  "message": "Roles updated successfully.",
  "user": {
    "isInvestor": true,
    "isMentor": false,
    "company": "Tech Ventures Inc",
    "position": "Senior Investment Manager",
    "experience": "10+ years in tech investments",
    "investmentFocus": [
      "AI",
      "FinTech",
      "EdTech"
    ],
    "mentorshipAreas": [
      "Business Strategy",
      "Product Development"
    ]
  }
}
```

**Available Fields:**
- `isInvestor` (boolean) - Mark as investor
- `isMentor` (boolean) - Mark as mentor
- `company` (string) - Company name
- `position` (string) - Job position/title
- `experience` (string) - Years of experience
- `investmentFocus` (array) - Investment areas of interest
- `mentorshipAreas` (array) - Areas willing to mentor in

---

## 🧪 **Testing Examples**

### **1. Mark as Investor**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/roles \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "isInvestor": true,
    "company": "Tech Ventures Inc",
    "position": "Senior Investment Manager",
    "experience": "10+ years in tech investments",
    "investmentFocus": ["AI", "FinTech", "EdTech"]
  }'
```

### **2. Mark as Mentor**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/roles \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "isMentor": true,
    "mentorshipAreas": ["Business Strategy", "Product Development", "Startup Growth"]
  }'
```

### **3. Update Password**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "currentPassword": "old_password",
    "newPassword": "new_password"
  }'
```

### **4. Update Email**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "newemail@example.com",
    "password": "current_password"
  }'
```

---

## ⚠️ **Error Responses**

### **400 Bad Request**
```json
{
  "message": "Current password is incorrect."
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
  "message": "Error updating roles",
  "error": "Detailed error description"
}
```

---

## 🔄 **Complete Workflow Example**

1. **Get current roles:**
   ```
   GET /api/users/profile/roles
   ```

2. **Mark as investor:**
   ```
   PATCH /api/users/profile/roles
   {
     "isInvestor": true,
     "company": "My Company",
     "investmentFocus": ["Tech", "Education"]
   }
   ```

3. **Update password:**
   ```
   PATCH /api/users/profile/password
   {
     "currentPassword": "old123",
     "newPassword": "new456"
   }
   ```

4. **Update email:**
   ```
   PATCH /api/users/profile/email
   {
     "email": "new@email.com",
     "password": "new456"
   }
   ```

All endpoints are now ready for frontend integration! 🚀 