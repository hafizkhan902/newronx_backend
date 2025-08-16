# 🔗 Idea Sharing API

## 📋 **Overview**

The StudentMate platform now supports **idea sharing** functionality that allows users to generate shareable links for their ideas and public ideas. Users can copy links to clipboard and share ideas across various social media platforms.

**🔗 Shared Links Work for Everyone:**
- ✅ **No Authentication Required** - Anyone can view shared public ideas
- ✅ **Direct Access** - Shared links work immediately without login
- ✅ **Privacy Protected** - Only public ideas can be accessed via shared links
- ✅ **SEO Friendly** - Public URLs can be indexed by search engines
- ✅ **Interactive** - Users can like, comment, approach, and suggest (with login prompt)

---

## 🔐 **Authentication Requirements**

All sharing endpoints require authentication via JWT token in cookies.

### **Sharing Permissions:**
- ✅ **Own ideas** - Users can share their own ideas regardless of privacy
- ✅ **Public ideas** - Users can share any idea with `privacy: 'Public'`
- ❌ **Private ideas** - Cannot be shared by non-authors
- ❌ **Team ideas** - Cannot be shared by non-team members

---

## 📡 **API Endpoints**

### **GET /api/ideas/:id/share**
Generate shareable link and social media sharing data for an idea.

**🔗 Shared Link Access:**
- **URL Format:** `http://localhost:3000/ideas/public/{ideaId}`
- **Public Access:** Anyone can view without authentication
- **Privacy Check:** Only works for ideas with `privacy: 'Public'`
- **Backend Endpoint:** `GET /api/ideas/public/{ideaId}` (no auth required)

**Example Request:**
```bash
curl -X GET "http://localhost:2000/api/ideas/68812a2c7173797ff80e77ef/share" \
  -b cookies.txt
```

**Example Response:**
```json
{
  "success": true,
  "message": "Shareable link generated successfully.",
  "data": {
    "ideaId": "68812a2c7173797ff80e77ef",
    "ideaTitle": "AI Weed Maker",
    "shareableLink": "http://localhost:3000/ideas/public/68812a2c7173797ff80e77ef",
    "shareData": {
      "title": "AI Weed Maker",
      "description": "Use ai to learn the machine to create the joint and sticks",
      "url": "http://localhost:3000/ideas/public/68812a2c7173797ff80e77ef",
      "author": "Hafiz Al Asad",
      "image": "https://res.cloudinary.com/dysr0wotl/image/upload/v1753295406/ideas/68812a2c7173797ff80e77ef_1753295404.png",
      "category": "Innovation",
      "engagement": {
        "approaches": 11,
        "suggestions": 6
      }
    },
    "shareFormats": {
      "direct": "http://localhost:3000/ideas/public/68812a2c7173797ff80e77ef",
      "twitter": "https://twitter.com/intent/tweet?text=Check%20out%20this%20idea%3A%20AI%20Weed%20Maker&url=http%3A%2F%2Flocalhost%3A3000%2Fideas%2Fpublic%2F68812a2c7173797ff80e77ef",
      "facebook": "https://www.facebook.com/sharer/sharer.php?u=http%3A%2F%2Flocalhost%3A3000%2Fideas%2Fpublic%2F68812a2c7173797ff80e77ef",
      "linkedin": "https://www.linkedin.com/sharing/share-offsite/?url=http%3A%2F%2Flocalhost%3A3000%2Fideas%2Fpublic%2F68812a2c7173797ff80e77ef",
      "whatsapp": "https://wa.me/?text=Check%20out%20this%20idea%3A%20AI%20Weed%20Maker%20-%20http%3A%2F%2Flocalhost%3A3000%2Fideas%2Fpublic%2F68812a2c7173797ff80e77ef",
      "email": "mailto:?subject=Check%20out%20this%20idea%3A%20AI%20Weed%20Maker&body=I%20found%20this%20interesting%20idea%20on%20StudentMate%3A%0A%0AAI%20Weed%20Maker%0A%0AUse%20ai%20to%20learn%20the%20machine%20to%20create%20the%20joint%20and%20sticks%0A%0AView%20it%20here%3A%20http%3A%2F%2Flocalhost%3A3000%2Fideas%2Fpublic%2F68812a2c7173797ff80e77ef"
    },
    "privacy": "Public",
    "status": "published",
    "isAuthor": true,
    "canShare": true
  }
}
```

### **POST /api/ideas/:id/share/copy**
Copy shareable link to clipboard (backend confirmation).

**Example Request:**
```bash
curl -X POST "http://localhost:2000/api/ideas/68812a2c7173797ff80e77ef/share/copy" \
  -b cookies.txt
```

**Example Response:**
```json
{
  "success": true,
  "message": "Link copied to clipboard successfully.",
  "data": {
    "ideaId": "68812a2c7173797ff80e77ef",
    "ideaTitle": "AI Weed Maker",
    "shareableLink": "http://localhost:3000/ideas/public/68812a2c7173797ff80e77ef",
    "copiedAt": "2025-08-01T23:14:24.752Z",
    "user": {
      "id": "687f97f5591a76291346952a",
      "name": "Hafiz Al Asad"
    }
  }
}
```

### **GET /api/ideas/:id/share/stats**
Get sharing statistics for an idea (authors only).

**Example Request:**
```bash
curl -X GET "http://localhost:2000/api/ideas/68812a2c7173797ff80e77ef/share/stats" \
  -b cookies.txt
```

**Example Response:**
```json
{
  "success": true,
  "message": "Sharing statistics retrieved successfully.",
  "data": {
    "ideaId": "68812a2c7173797ff80e77ef",
    "ideaTitle": "AI Weed Maker",
    "shareStats": {
      "totalShares": 11,
      "socialShares": {
        "twitter": 13,
        "facebook": 13,
        "linkedin": 10,
        "whatsapp": 4,
        "email": 2
      },
      "directCopies": 10,
      "lastShared": "2025-07-29T21:34:59.828Z",
      "shareableLink": "http://localhost:3000/ideas/public/68812a2c7173797ff80e77ef"
    },
    "isPublic": true,
    "canShare": true
  }
}
```

---

## 🔄 **Frontend Integration Examples**

### **1. Test Shared Link Access (No Authentication):**
```javascript
// Test if a shared link works for anyone
const testSharedLink = async (ideaId) => {
  try {
    const response = await fetch(`/api/ideas/public/${ideaId}`);
    
    if (!response.ok) {
      throw new Error('Shared link not accessible');
    }
    
    const idea = await response.json();
    return {
      accessible: true,
      title: idea.title,
      author: idea.author.fullName,
      requiresLogin: idea.preview?.requiresLogin || false
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message
    };
  }
};

// Usage: Test if a shared link works
const result = await testSharedLink('68812a2c7173797ff80e77ef');
console.log(result);
// Output: { accessible: true, title: "AI Weed Maker", author: "Hafiz Al Asad", requiresLogin: true }
```

### **2. Generate Shareable Link:**
```javascript
const generateShareLink = async (ideaId) => {
  try {
    const response = await fetch(`/api/ideas/${ideaId}/share`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate share link');
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error generating share link:', error);
    throw error;
  }
};
```

### **2. Copy Link to Clipboard:**
```javascript
const copyToClipboard = async (ideaId) => {
  try {
    // First, get the shareable link
    const shareData = await generateShareLink(ideaId);
    
    // Copy to clipboard using browser API
    await navigator.clipboard.writeText(shareData.shareableLink);
    
    // Confirm with backend
    const response = await fetch(`/api/ideas/${ideaId}/share/copy`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to confirm copy action');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    throw error;
  }
};
```

### **3. Share to Social Media:**
```javascript
const shareToSocialMedia = async (ideaId, platform) => {
  try {
    const shareData = await generateShareLink(ideaId);
    
    switch (platform) {
      case 'twitter':
        window.open(shareData.shareFormats.twitter, '_blank');
        break;
      case 'facebook':
        window.open(shareData.shareFormats.facebook, '_blank');
        break;
      case 'linkedin':
        window.open(shareData.shareFormats.linkedin, '_blank');
        break;
      case 'whatsapp':
        window.open(shareData.shareFormats.whatsapp, '_blank');
        break;
      case 'email':
        window.open(shareData.shareFormats.email, '_blank');
        break;
      default:
        throw new Error('Unsupported platform');
    }
  } catch (error) {
    console.error('Error sharing to social media:', error);
    throw error;
  }
};
```

### **4. React Component Example:**
```jsx
import React, { useState } from 'react';

const IdeaShareButton = ({ ideaId, ideaTitle }) => {
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const data = await generateShareLink(ideaId);
      setShareData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(ideaId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const handleSocialShare = (platform) => {
    shareToSocialMedia(ideaId, platform);
  };

  return (
    <div className="idea-share">
      <button 
        onClick={handleShare}
        disabled={loading}
        className="share-btn"
      >
        {loading ? 'Loading...' : 'Share Idea'}
      </button>

      {shareData && (
        <div className="share-options">
          <div className="share-link">
            <input 
              type="text" 
              value={shareData.shareableLink} 
              readOnly 
            />
            <button onClick={handleCopyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="social-share">
            <button onClick={() => handleSocialShare('twitter')}>
              Share on Twitter
            </button>
            <button onClick={() => handleSocialShare('facebook')}>
              Share on Facebook
            </button>
            <button onClick={() => handleSocialShare('linkedin')}>
              Share on LinkedIn
            </button>
            <button onClick={() => handleSocialShare('whatsapp')}>
              Share on WhatsApp
            </button>
            <button onClick={() => handleSocialShare('email')}>
              Share via Email
            </button>
          </div>

          <div className="share-info">
            <p><strong>Title:</strong> {shareData.shareData.title}</p>
            <p><strong>Author:</strong> {shareData.shareData.author}</p>
            <p><strong>Engagement:</strong> {shareData.shareData.engagement.approaches} approaches, {shareData.shareData.engagement.suggestions} suggestions</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeaShareButton;
```

### **5. Share Statistics Component:**
```jsx
const ShareStats = ({ ideaId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/share/stats`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data.data.shareStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [ideaId]);

  if (loading) return <div>Loading stats...</div>;
  if (!stats) return null;

  return (
    <div className="share-stats">
      <h3>Sharing Statistics</h3>
      <div className="stats-grid">
        <div className="stat">
          <span className="number">{stats.totalShares}</span>
          <span className="label">Total Shares</span>
        </div>
        <div className="stat">
          <span className="number">{stats.directCopies}</span>
          <span className="label">Direct Copies</span>
        </div>
        <div className="stat">
          <span className="number">{stats.socialShares.twitter}</span>
          <span className="label">Twitter Shares</span>
        </div>
        <div className="stat">
          <span className="number">{stats.socialShares.facebook}</span>
          <span className="label">Facebook Shares</span>
        </div>
        <div className="stat">
          <span className="number">{stats.socialShares.linkedin}</span>
          <span className="label">LinkedIn Shares</span>
        </div>
      </div>
      <p className="last-shared">
        Last shared: {new Date(stats.lastShared).toLocaleDateString()}
      </p>
    </div>
  );
};
```

---

## 🛡️ **Security Features**

### **Access Control:**
- ✅ **Authentication required** - All sharing endpoints require login
- ✅ **Author permissions** - Users can share their own ideas
- ✅ **Public idea access** - Anyone can share public ideas
- ✅ **Privacy protection** - Private/team ideas protected

### **Data Protection:**
- ✅ **Limited exposure** - Only necessary data for sharing
- ✅ **Public URLs only** - Links point to public endpoints
- ✅ **No sensitive info** - No internal IDs or private data
- ✅ **Analytics tracking** - Share actions logged for insights

---

## 📊 **Share Formats**

### **Available Platforms:**
- **Direct Link** - Copy to clipboard
- **Twitter** - Pre-filled tweet with idea title and link
- **Facebook** - Share dialog with idea link
- **LinkedIn** - Professional sharing with link
- **WhatsApp** - Direct message with idea info
- **Email** - Pre-filled email with idea details

### **Share Data Structure:**
```json
{
  "title": "Idea Title",
  "description": "Truncated description (max 160 chars)",
  "url": "Public shareable link",
  "author": "Author name",
  "image": "Featured image URL",
  "category": "Idea category",
  "engagement": {
    "approaches": 11,
    "suggestions": 6
  }
}
```

---

## ⚠️ **Error Responses**

### **401 Unauthorized:**
```json
{
  "message": "No token, authorization denied."
}
```

### **403 Forbidden:**
```json
{
  "message": "You can only share your own ideas or public ideas."
}
```

### **404 Not Found:**
```json
{
  "message": "Idea not found."
}
```

### **500 Internal Server Error:**
```json
{
  "message": "Error generating share link",
  "error": "Detailed error description"
}
```

---

## 🎯 **Use Cases**

### **1. Content Marketing:**
- Share interesting ideas on social media
- Drive traffic to the platform
- Increase idea discoverability
- **Viral sharing** - Anyone can view shared links without registration

### **2. Collaboration:**
- Share ideas with potential collaborators
- Send ideas via email for feedback
- Share on professional networks
- **Instant access** - Recipients can view immediately without login

### **3. Analytics:**
- Track sharing performance
- Monitor idea popularity
- Analyze user engagement
- **Conversion tracking** - See how many visitors from shared links

### **4. User Growth:**
- Viral sharing of interesting ideas
- Social media exposure
- Referral traffic generation
- **SEO benefits** - Public URLs can be indexed by search engines

### **5. Public Discovery:**
- **No barriers** - Anyone can discover ideas through shared links
- **Social proof** - High engagement visible to potential users
- **Network effects** - Shared content drives platform adoption
- **Interactive engagement** - Users can interact with content and get prompted to join

### **6. User Conversion:**
- **Seamless onboarding** - View content first, then register to interact
- **Value demonstration** - Users see platform value before committing
- **Reduced friction** - No upfront registration required
- **Natural progression** - From viewer to active participant

---

## 🔄 **Workflow Examples**

### **1. Share Idea Flow:**
```
1. User clicks "Share" button
2. Frontend calls /api/ideas/:id/share
3. Backend validates permissions
4. Generates shareable link and formats
5. Returns sharing data to frontend
6. User chooses sharing method
7. Link copied or social media opened
8. Backend logs share action
```

### **2. Shared Link Access Flow:**
```
1. Anyone receives shared link
2. Clicks link: http://localhost:3000/ideas/public/{ideaId}
3. Frontend calls /api/ideas/public/{ideaId} (no auth)
4. Backend checks if idea is public
5. Returns idea data if public, 404 if private
6. User can view idea without login
7. Login prompts shown for interactions
```

### **3. Copy to Clipboard Flow:**
```
1. User clicks "Copy Link"
2. Frontend copies link to clipboard
3. Frontend calls /api/ideas/:id/share/copy
4. Backend confirms and logs action
5. User gets confirmation message
```

### **4. View Share Stats Flow:**
```
1. Author clicks "View Stats"
2. Frontend calls /api/ideas/:id/share/stats
3. Backend validates author permissions
4. Returns sharing statistics
5. Frontend displays analytics
```

### **3. View Share Stats Flow:**
```
1. Author clicks "View Stats"
2. Frontend calls /api/ideas/:id/share/stats
3. Backend validates author permissions
4. Returns sharing statistics
5. Frontend displays analytics
```

The idea sharing system is now ready for production use! 🚀 