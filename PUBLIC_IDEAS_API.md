# 🌐 Public Ideas Browsing API

## 📋 **Overview**

The StudentMate platform now supports **public idea browsing** where users can view published ideas without authentication, while requiring login only for posting and interactions. This increases discoverability and engagement while maintaining security.

---

## 🔐 **Authentication Requirements**

### **Public Access (No Authentication Required):**
- ✅ Browse published ideas with **privacy: 'Public'**
- ✅ View idea details (public ideas only)
- ✅ Search and filter ideas (public ideas only)
- ✅ View author profiles (limited info)
- ✅ See engagement statistics

### **Authentication Required:**
- 🔒 Post new ideas
- 🔒 Comment and suggest
- 🔒 Approach ideas (apply for roles)
- 🔒 Like/appreciate ideas
- 🔒 Full interaction features
- 🔒 Personal dashboard
- 🔒 View private and team ideas

---

## 📡 **API Endpoints**

### **GET /api/ideas/public**
Browse all published ideas with **privacy: 'Public'** (no authentication required).

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `category` (string) - Filter by category
- `search` (string) - Search in title and description
- `sort` (string) - Sort order: `latest`, `oldest`, `popular`, `trending`

**Example Request:**
```bash
curl -X GET "http://localhost:2000/api/ideas/public?page=1&limit=5&search=AI&sort=popular"
```

**Example Response:**
```json
{
  "ideas": [
    {
      "_id": "68812a2c7173797ff80e77ef",
      "title": "AI Weed Maker",
      "description": "Use ai to learn the machine to create the joint and sticks",
      "category": null,
      "image": null,
      "createdAt": "2025-07-23T18:30:04.502Z",
      "updatedAt": "2025-07-24T08:04:43.423Z",
      "author": {
        "_id": "687f97f5591a76291346952a",
        "firstName": "Hafiz",
        "fullName": "Hafiz Al Asad",
        "avatar": "https://res.cloudinary.com/dysr0wotl/image/upload/v1753409607/avatars/687f97f5591a76291346952a.jpg",
        "bio": "World is so big nigga",
        "company": "Tech Ventures Inc",
        "position": "Senior Investment Manager"
      },
      "stats": {
        "approaches": 11,
        "suggestions": 6
      },
      "requiresLogin": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 2,
    "hasNextPage": false,
    "hasPrevPage": false,
    "limit": 10
  },
  "filters": {
    "category": "all",
    "search": "AI",
    "sort": "popular"
  }
}
```

### **GET /api/ideas/public/:id**
Get detailed view of a single published idea with **privacy: 'Public'** (no authentication required).

**Example Request:**
```bash
curl -X GET "http://localhost:2000/api/ideas/public/68812a2c7173797ff80e77ef"
```

**Example Response:**
```json
{
  "_id": "68812a2c7173797ff80e77ef",
  "title": "AI Weed Maker",
  "description": "Use ai to learn the machine to create the joint and sticks",
  "category": null,
  "image": null,
  "createdAt": "2025-07-23T18:30:04.502Z",
  "updatedAt": "2025-07-24T08:04:43.423Z",
  "author": {
    "_id": "687f97f5591a76291346952a",
    "firstName": "Hafiz",
    "fullName": "Hafiz Al Asad",
    "avatar": "https://res.cloudinary.com/dysr0wotl/image/upload/v1753409607/avatars/687f97f5591a76291346952a.jpg",
    "bio": "World is so big nigga",
    "company": "Tech Ventures Inc",
    "position": "Senior Investment Manager",
    "isInvestor": true,
    "isMentor": true
  },
  "stats": {
    "approaches": 11,
    "suggestions": 6
  },
  "preview": {
    "hasApproaches": true,
    "hasSuggestions": true,
    "requiresLogin": true
  }
}
```

### **GET /api/ideas/categories**
Get available categories for public ideas only (no authentication required).

**Example Request:**
```bash
curl -X GET "http://localhost:2000/api/ideas/categories"
```

**Example Response:**
```json
{
  "categories": [
    {
      "category": "Technology",
      "count": 15
    },
    {
      "category": "Healthcare",
      "count": 8
    },
    {
      "category": "Education",
      "count": 12
    }
  ],
  "total": 35
}
```

### **GET /api/ideas/feed** (Authenticated)
Get full feed with interaction data (authentication required).

**Example Request:**
```bash
curl -X GET "http://localhost:2000/api/ideas/feed" \
  -b cookies.txt
```

---

## 🔍 **Search & Filter Examples**

### **1. Search by Keyword:**
```bash
curl -X GET "http://localhost:2000/api/ideas/public?search=AI"
```

### **2. Filter by Category:**
```bash
curl -X GET "http://localhost:2000/api/ideas/public?category=Technology"
```

### **3. Sort by Popularity:**
```bash
curl -X GET "http://localhost:2000/api/ideas/public?sort=popular"
```

### **4. Combined Filters:**
```bash
curl -X GET "http://localhost:2000/api/ideas/public?search=startup&category=Technology&sort=trending&page=1&limit=5"
```

### **5. Pagination:**
```bash
curl -X GET "http://localhost:2000/api/ideas/public?page=2&limit=10"
```

---

## 📊 **Sort Options**

### **Available Sort Types:**
- `latest` - Newest ideas first (default)
- `oldest` - Oldest ideas first
- `popular` - Most engagement (approaches + suggestions)
- `trending` - Recently updated ideas

### **Sort Examples:**
```bash
# Latest ideas
curl -X GET "http://localhost:2000/api/ideas/public?sort=latest"

# Most popular ideas
curl -X GET "http://localhost:2000/api/ideas/public?sort=popular"

# Trending ideas
curl -X GET "http://localhost:2000/api/ideas/public?sort=trending"
```

---

## 🔄 **Frontend Integration Examples**

### **1. Public Ideas Browser:**
```javascript
const browsePublicIdeas = async (filters = {}) => {
  try {
    const params = new URLSearchParams({
      page: filters.page || 1,
      limit: filters.limit || 10,
      category: filters.category || 'all',
      search: filters.search || '',
      sort: filters.sort || 'latest'
    });
    
    const response = await fetch(`/api/ideas/public?${params}`);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error fetching public ideas:', error);
    throw error;
  }
};

// Usage
const ideas = await browsePublicIdeas({
  search: 'AI',
  sort: 'popular',
  page: 1,
  limit: 5
});
```

### **2. Public Idea Detail View:**
```javascript
const getPublicIdea = async (ideaId) => {
  try {
    const response = await fetch(`/api/ideas/public/${ideaId}`);
    const idea = await response.json();
    
    return idea;
  } catch (error) {
    console.error('Error fetching public idea:', error);
    throw error;
  }
};
```

### **3. React Component Example:**
```jsx
import React, { useState, useEffect } from 'react';

const PublicIdeasBrowser = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    category: 'all',
    search: '',
    sort: 'latest'
  });

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/ideas/public?${params}`);
      const data = await response.json();
      setIdeas(data.ideas);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, [filters]);

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleSort = (sortType) => {
    setFilters(prev => ({ ...prev, sort: sortType, page: 1 }));
  };

  return (
    <div className="public-ideas-browser">
      <div className="filters">
        <input
          type="text"
          placeholder="Search ideas..."
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select onChange={(e) => handleSort(e.target.value)}>
          <option value="latest">Latest</option>
          <option value="popular">Popular</option>
          <option value="trending">Trending</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="ideas-grid">
          {ideas.map(idea => (
            <div key={idea._id} className="idea-card">
              <h3>{idea.title}</h3>
              <p>{idea.description}</p>
              <div className="author">
                <img src={idea.author.avatar} alt={idea.author.fullName} />
                <span>{idea.author.fullName}</span>
              </div>
              <div className="stats">
                <span>{idea.stats.approaches} approaches</span>
                <span>{idea.stats.suggestions} suggestions</span>
              </div>
              {idea.requiresLogin && (
                <div className="login-prompt">
                  <p>Login to interact with this idea</p>
                  <button onClick={() => navigate('/login')}>
                    Login to Continue
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicIdeasBrowser;
```

### **4. Categories Component:**
```jsx
const CategoriesFilter = ({ onCategoryChange, selectedCategory }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/ideas/categories');
        const data = await response.json();
        setCategories(data.categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="categories-filter">
      <select 
        value={selectedCategory} 
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        <option value="all">All Categories ({categories.reduce((sum, cat) => sum + cat.count, 0)})</option>
        {categories.map(cat => (
          <option key={cat.category} value={cat.category}>
            {cat.category} ({cat.count})
          </option>
        ))}
      </select>
    </div>
  );
};
```

---

## 🛡️ **Security Features**

### **Public View Limitations:**
- ✅ **No sensitive data exposure** - Only published ideas shown
- ✅ **Limited author info** - Basic profile details only
- ✅ **No interaction content** - Only statistics shown
- ✅ **Login prompts** - Clear calls-to-action for engagement

### **Privacy Protection:**
- ✅ **Draft ideas hidden** - Only published ideas visible
- ✅ **Public ideas only** - Only ideas with privacy: 'Public' shown
- ✅ **Private/Team ideas excluded** - Respects privacy settings
- ✅ **Limited author details** - No contact information exposed
- ✅ **No internal IDs** - Clean, user-friendly responses

---

## 📈 **Benefits**

### **For Users:**
- 🎯 **Discoverability** - Find interesting ideas without registration
- 🔍 **Easy browsing** - Search and filter without login
- 📊 **Engagement preview** - See activity levels before joining
- 🚀 **Quick access** - Immediate value without barriers

### **For Platform:**
- 📈 **Increased traffic** - Public content drives SEO
- 🎯 **Better conversion** - Users see value before signing up
- 🔗 **Social sharing** - Public URLs can be shared
- 📊 **Analytics** - Track public vs authenticated usage

---

## 🔄 **Workflow Examples**

### **1. Public Discovery Flow:**
```
1. User visits public ideas page
2. Browses public ideas without login
3. Searches for specific topics (public ideas only)
4. Views idea details (public ideas only)
5. Sees engagement statistics
6. Clicks "Login to Interact"
7. Registers/logs in
8. Full access to all ideas and interactions
```

### **2. SEO-Friendly URLs:**
```
Public: /ideas/public/68812a2c7173797ff80e77ef
Authenticated: /ideas/68812a2c7173797ff80e77ef
```

### **3. Social Sharing:**
```
Public idea URLs can be shared on:
- Social media platforms
- Email newsletters
- Blog posts
- External websites
```

---

## ⚠️ **Error Responses**

### **404 Not Found:**
```json
{
  "message": "Idea not found or not published."
}
```

### **500 Internal Server Error:**
```json
{
  "message": "Error fetching public ideas",
  "error": "Detailed error description"
}
```

---

## 🎯 **Use Cases**

### **1. Content Discovery:**
- Users can discover ideas without registration
- Search engines can index public content
- Social media sharing of interesting ideas

### **2. User Acquisition:**
- Show platform value before signup
- Demonstrate community activity
- Preview engagement opportunities

### **3. SEO & Marketing:**
- Public URLs for content marketing
- Search engine optimization
- Social media campaigns

### **4. Community Building:**
- Increase platform visibility
- Attract new users through content
- Build trust through transparency

The public ideas browsing system is now ready for production use! 🚀 