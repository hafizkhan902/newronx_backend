# 🎨 Theme Settings API Endpoints

## 🔐 Authentication
All endpoints require authentication via JWT token in cookies.

---

## 🌓 **THEME MANAGEMENT**

### **GET /api/users/profile/theme**
Get current theme settings.

**Example Response:**
```json
{
  "theme": {
    "mode": "auto",
    "accentColor": "#10B981",
    "fontSize": "large",
    "reducedMotion": true
  }
}
```

### **PATCH /api/users/profile/theme**
Update theme settings (all properties).

**Request Body:**
```json
{
  "mode": "dark",
  "accentColor": "#8B5CF6",
  "fontSize": "medium",
  "reducedMotion": false
}
```

**Available Theme Settings:**
- `mode` (string) - "light", "dark", or "auto"
- `accentColor` (string) - Hex color code (e.g., "#3B82F6")
- `fontSize` (string) - "small", "medium", or "large"
- `reducedMotion` (boolean) - Enable/disable animations

**Example Response:**
```json
{
  "message": "Theme settings updated successfully.",
  "theme": {
    "mode": "dark",
    "accentColor": "#8B5CF6",
    "fontSize": "medium",
    "reducedMotion": false
  }
}
```

### **PATCH /api/users/profile/theme/mode**
Update only the theme mode (quick toggle).

**Request Body:**
```json
{
  "mode": "light"
}
```

**Theme Modes:**
- `light` - Light theme
- `dark` - Dark theme
- `auto` - Follows system preference

**Example Response:**
```json
{
  "message": "Theme mode updated successfully.",
  "theme": {
    "mode": "light"
  }
}
```

---

## 🧪 **Testing Examples**

### **1. Get Current Theme Settings**
```bash
curl -X GET http://localhost:2000/api/users/profile/theme \
  -b cookies.txt
```

### **2. Switch to Dark Mode**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/theme/mode \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"mode": "dark"}'
```

### **3. Switch to Light Mode**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/theme/mode \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"mode": "light"}'
```

### **4. Set Auto Mode (Follow System)**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/theme/mode \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"mode": "auto"}'
```

### **5. Update Complete Theme Settings**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/theme \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "mode": "dark",
    "accentColor": "#EF4444",
    "fontSize": "large",
    "reducedMotion": true
  }'
```

---

## 🔄 **Frontend Integration Examples**

### **1. Theme Mode Toggle:**
```javascript
// Toggle between light and dark mode
const toggleTheme = async () => {
  const currentTheme = await getCurrentTheme();
  const newMode = currentTheme.mode === 'light' ? 'dark' : 'light';
  
  await fetch('/api/users/profile/theme/mode', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: newMode })
  });
  
  // Update UI immediately
  document.documentElement.setAttribute('data-theme', newMode);
};
```

### **2. Auto Theme Detection:**
```javascript
// Set auto mode and listen for system changes
const enableAutoTheme = async () => {
  await fetch('/api/users/profile/theme/mode', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'auto' })
  });
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const theme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  });
};
```

### **3. Custom Accent Color:**
```javascript
// Update accent color
const updateAccentColor = async (color) => {
  await fetch('/api/users/profile/theme', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accentColor: color })
  });
  
  // Update CSS custom properties
  document.documentElement.style.setProperty('--accent-color', color);
};
```

### **4. Font Size Control:**
```javascript
// Update font size
const updateFontSize = async (size) => {
  await fetch('/api/users/profile/theme', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fontSize: size })
  });
  
  // Update CSS classes
  document.body.className = document.body.className.replace(/font-\w+/, `font-${size}`);
};
```

### **5. Reduced Motion Toggle:**
```javascript
// Toggle reduced motion
const toggleReducedMotion = async () => {
  const currentTheme = await getCurrentTheme();
  const newSetting = !currentTheme.reducedMotion;
  
  await fetch('/api/users/profile/theme', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reducedMotion: newSetting })
  });
  
  // Update CSS
  if (newSetting) {
    document.documentElement.style.setProperty('--motion-reduce', 'reduce');
  } else {
    document.documentElement.style.removeProperty('--motion-reduce');
  }
};
```

---

## 📋 **Theme Settings Overview**

### **Theme Modes:**
- **Light** - Bright theme with light backgrounds
- **Dark** - Dark theme with dark backgrounds
- **Auto** - Follows system preference

### **Accent Colors:**
- **Blue** - `#3B82F6` (default)
- **Green** - `#10B981`
- **Purple** - `#8B5CF6`
- **Red** - `#EF4444`
- **Orange** - `#F97316`
- **Custom** - Any valid hex color

### **Font Sizes:**
- **Small** - Compact text
- **Medium** - Standard text (default)
- **Large** - Larger text for accessibility

### **Accessibility:**
- **Reduced Motion** - Disables animations for users with motion sensitivity

---

## 🎨 **CSS Integration Examples**

### **1. Theme Variables:**
```css
:root {
  /* Light theme defaults */
  --bg-primary: #ffffff;
  --text-primary: #1f2937;
  --accent-color: #3B82F6;
}

[data-theme="dark"] {
  /* Dark theme overrides */
  --bg-primary: #1f2937;
  --text-primary: #f9fafb;
}

[data-theme="auto"] {
  /* Auto theme uses system preference */
  --bg-primary: light-dark(#ffffff, #1f2937);
  --text-primary: light-dark(#1f2937, #f9fafb);
}
```

### **2. Font Size Classes:**
```css
.font-small {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.font-medium {
  font-size: 1rem;
  line-height: 1.5rem;
}

.font-large {
  font-size: 1.125rem;
  line-height: 1.75rem;
}
```

### **3. Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## ⚠️ **Error Responses**

### **400 Bad Request**
```json
{
  "message": "Valid theme mode is required (light, dark, or auto)."
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
  "message": "Error updating theme settings",
  "error": "Detailed error description"
}
```

---

## 🔄 **Complete Theme Workflow**

1. **Get current theme:**
   ```
   GET /api/users/profile/theme
   ```

2. **Quick theme toggle:**
   ```
   PATCH /api/users/profile/theme/mode
   {
     "mode": "dark"
   }
   ```

3. **Update all theme settings:**
   ```
   PATCH /api/users/profile/theme
   {
     "mode": "auto",
     "accentColor": "#10B981",
     "fontSize": "large",
     "reducedMotion": true
   }
   ```

4. **Apply theme to UI:**
   ```javascript
   // Update CSS variables and classes
   document.documentElement.setAttribute('data-theme', theme.mode);
   document.documentElement.style.setProperty('--accent-color', theme.accentColor);
   ```

All theme endpoints are now ready for frontend integration! 🚀 