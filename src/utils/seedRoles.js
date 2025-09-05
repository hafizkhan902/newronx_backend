import RoleDefinition from '../models/roleDefinition.model.js';

// Common role definitions for seeding
const commonRoles = [
  // Technical Roles
  {
    roleName: 'Frontend Developer',
    normalizedName: 'frontend developer',
    category: 'technical',
    description: 'Develops user interfaces and client-side functionality',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular'],
    optionalSkills: ['TypeScript', 'SASS', 'Webpack', 'Testing'],
    responsibilities: ['UI Development', 'User Experience', 'Client-side Logic', 'API Integration'],
    industryRelevance: ['tech', 'web', 'mobile', 'saas'],
    commonSubroles: [
      { name: 'Senior Frontend Developer', skillLevel: 'senior' },
      { name: 'React Developer', skillLevel: 'specialist' },
      { name: 'UI Developer', skillLevel: 'specialist' },
      { name: 'Mobile Frontend Developer', skillLevel: 'specialist' }
    ],
    similarRoles: ['UI Developer', 'Web Developer', 'React Developer'],
    alternativeNames: ['front-end developer', 'ui developer', 'web developer']
  },
  {
    roleName: 'Backend Developer',
    normalizedName: 'backend developer',
    category: 'technical',
    description: 'Develops server-side logic, APIs, and database systems',
    requiredSkills: ['Node.js', 'Python', 'Java', 'Database Design', 'API Development'],
    optionalSkills: ['Docker', 'Kubernetes', 'AWS', 'MongoDB', 'PostgreSQL'],
    responsibilities: ['API Development', 'Database Design', 'Server Management', 'Security'],
    industryRelevance: ['tech', 'web', 'saas', 'fintech'],
    commonSubroles: [
      { name: 'Senior Backend Developer', skillLevel: 'senior' },
      { name: 'API Developer', skillLevel: 'specialist' },
      { name: 'Database Developer', skillLevel: 'specialist' },
      { name: 'DevOps Engineer', skillLevel: 'specialist' }
    ],
    similarRoles: ['Server Developer', 'API Developer', 'Database Developer'],
    alternativeNames: ['back-end developer', 'server developer', 'api developer']
  },
  {
    roleName: 'Full Stack Developer',
    normalizedName: 'full stack developer',
    category: 'technical',
    description: 'Develops both frontend and backend components',
    requiredSkills: ['JavaScript', 'Node.js', 'React', 'Database', 'API Development'],
    optionalSkills: ['TypeScript', 'Docker', 'AWS', 'Testing', 'DevOps'],
    responsibilities: ['End-to-end Development', 'System Architecture', 'Database Design', 'UI/UX'],
    industryRelevance: ['tech', 'web', 'saas', 'mobile'],
    commonSubroles: [
      { name: 'Senior Full Stack Developer', skillLevel: 'senior' },
      { name: 'Lead Developer', skillLevel: 'lead' },
      { name: 'Technical Lead', skillLevel: 'lead' }
    ],
    similarRoles: ['Web Developer', 'Software Developer', 'Application Developer'],
    alternativeNames: ['fullstack developer', 'web developer', 'software developer']
  },

  // Design Roles
  {
    roleName: 'UI/UX Designer',
    normalizedName: 'ui/ux designer',
    category: 'creative',
    description: 'Designs user interfaces and user experiences',
    requiredSkills: ['Figma', 'Adobe XD', 'Sketch', 'User Research', 'Prototyping'],
    optionalSkills: ['Adobe Creative Suite', 'Principle', 'InVision', 'HTML/CSS'],
    responsibilities: ['User Research', 'Wireframing', 'Prototyping', 'Visual Design'],
    industryRelevance: ['tech', 'web', 'mobile', 'saas'],
    commonSubroles: [
      { name: 'UI Designer', skillLevel: 'specialist' },
      { name: 'UX Designer', skillLevel: 'specialist' },
      { name: 'Product Designer', skillLevel: 'senior' },
      { name: 'Design Lead', skillLevel: 'lead' }
    ],
    similarRoles: ['Product Designer', 'Visual Designer', 'Interaction Designer'],
    alternativeNames: ['ui designer', 'ux designer', 'product designer']
  },

  // Business Roles
  {
    roleName: 'Product Manager',
    normalizedName: 'product manager',
    category: 'business',
    description: 'Manages product strategy, roadmap, and development',
    requiredSkills: ['Product Strategy', 'Market Research', 'Analytics', 'Project Management'],
    optionalSkills: ['Agile', 'Scrum', 'SQL', 'A/B Testing', 'User Research'],
    responsibilities: ['Product Strategy', 'Roadmap Planning', 'Feature Prioritization', 'Stakeholder Management'],
    industryRelevance: ['tech', 'saas', 'mobile', 'ecommerce'],
    commonSubroles: [
      { name: 'Senior Product Manager', skillLevel: 'senior' },
      { name: 'Product Owner', skillLevel: 'specialist' },
      { name: 'Technical Product Manager', skillLevel: 'specialist' },
      { name: 'Head of Product', skillLevel: 'lead' }
    ],
    similarRoles: ['Product Owner', 'Project Manager', 'Business Analyst'],
    alternativeNames: ['product owner', 'pm', 'product lead']
  },
  {
    roleName: 'Business Development',
    normalizedName: 'business development',
    category: 'business',
    description: 'Develops business strategy, partnerships, and growth opportunities',
    requiredSkills: ['Sales', 'Negotiation', 'Market Analysis', 'Partnership Development'],
    optionalSkills: ['CRM', 'Lead Generation', 'Contract Negotiation', 'Financial Modeling'],
    responsibilities: ['Partnership Development', 'Market Expansion', 'Revenue Growth', 'Strategic Planning'],
    industryRelevance: ['tech', 'saas', 'ecommerce', 'fintech'],
    commonSubroles: [
      { name: 'Business Development Manager', skillLevel: 'mid' },
      { name: 'Partnership Manager', skillLevel: 'specialist' },
      { name: 'Sales Manager', skillLevel: 'specialist' },
      { name: 'Head of Business Development', skillLevel: 'lead' }
    ],
    similarRoles: ['Sales Manager', 'Partnership Manager', 'Growth Manager'],
    alternativeNames: ['biz dev', 'business dev', 'bd']
  },

  // Marketing Roles
  {
    roleName: 'Digital Marketing',
    normalizedName: 'digital marketing',
    category: 'marketing',
    description: 'Manages digital marketing campaigns and online presence',
    requiredSkills: ['Google Ads', 'Facebook Ads', 'SEO', 'Content Marketing', 'Analytics'],
    optionalSkills: ['Email Marketing', 'Social Media', 'Conversion Optimization', 'Marketing Automation'],
    responsibilities: ['Campaign Management', 'Lead Generation', 'Brand Awareness', 'Performance Analysis'],
    industryRelevance: ['tech', 'ecommerce', 'saas', 'mobile'],
    commonSubroles: [
      { name: 'Digital Marketing Manager', skillLevel: 'mid' },
      { name: 'Performance Marketing', skillLevel: 'specialist' },
      { name: 'Growth Marketing', skillLevel: 'specialist' },
      { name: 'Marketing Lead', skillLevel: 'lead' }
    ],
    similarRoles: ['Growth Marketing', 'Performance Marketing', 'Online Marketing'],
    alternativeNames: ['digital marketer', 'online marketing', 'growth marketing']
  },
  {
    roleName: 'Content Marketing',
    normalizedName: 'content marketing',
    category: 'marketing',
    description: 'Creates and manages content strategy and marketing materials',
    requiredSkills: ['Content Writing', 'SEO', 'Content Strategy', 'Social Media'],
    optionalSkills: ['Video Production', 'Graphic Design', 'Email Marketing', 'Analytics'],
    responsibilities: ['Content Strategy', 'Blog Writing', 'Social Media Management', 'Brand Voice'],
    industryRelevance: ['tech', 'ecommerce', 'education', 'saas'],
    commonSubroles: [
      { name: 'Content Marketing Manager', skillLevel: 'mid' },
      { name: 'Content Strategist', skillLevel: 'specialist' },
      { name: 'Social Media Manager', skillLevel: 'specialist' },
      { name: 'Content Lead', skillLevel: 'lead' }
    ],
    similarRoles: ['Content Creator', 'Social Media Manager', 'Content Strategist'],
    alternativeNames: ['content creator', 'content strategist', 'content manager']
  },

  // Data & Analytics
  {
    roleName: 'Data Scientist',
    normalizedName: 'data scientist',
    category: 'technical',
    description: 'Analyzes data to extract insights and build predictive models',
    requiredSkills: ['Python', 'R', 'Machine Learning', 'Statistics', 'SQL'],
    optionalSkills: ['TensorFlow', 'PyTorch', 'Tableau', 'Apache Spark', 'Deep Learning'],
    responsibilities: ['Data Analysis', 'Model Development', 'Statistical Analysis', 'Data Visualization'],
    industryRelevance: ['tech', 'ai', 'fintech', 'healthcare'],
    commonSubroles: [
      { name: 'Senior Data Scientist', skillLevel: 'senior' },
      { name: 'ML Engineer', skillLevel: 'specialist' },
      { name: 'Data Analyst', skillLevel: 'junior' },
      { name: 'AI Researcher', skillLevel: 'specialist' }
    ],
    similarRoles: ['Machine Learning Engineer', 'Data Analyst', 'AI Engineer'],
    alternativeNames: ['ml engineer', 'data analyst', 'ai engineer']
  },

  // Operations
  {
    roleName: 'Operations Manager',
    normalizedName: 'operations manager',
    category: 'operations',
    description: 'Manages day-to-day operations and process optimization',
    requiredSkills: ['Process Management', 'Project Management', 'Analytics', 'Team Leadership'],
    optionalSkills: ['Lean Management', 'Six Sigma', 'Supply Chain', 'Quality Management'],
    responsibilities: ['Process Optimization', 'Team Management', 'Performance Monitoring', 'Strategic Planning'],
    industryRelevance: ['tech', 'ecommerce', 'saas', 'other'],
    commonSubroles: [
      { name: 'Senior Operations Manager', skillLevel: 'senior' },
      { name: 'Operations Lead', skillLevel: 'lead' },
      { name: 'Process Manager', skillLevel: 'specialist' },
      { name: 'COO', skillLevel: 'lead' }
    ],
    similarRoles: ['Project Manager', 'Process Manager', 'Operations Lead'],
    alternativeNames: ['ops manager', 'operations lead', 'process manager']
  }
];

// Function to seed role definitions
export async function seedRoleDefinitions() {
  try {
    console.log('🌱 Seeding role definitions...');
    
    // Clear existing roles (optional - remove in production)
    // await RoleDefinition.deleteMany({});
    
    let seededCount = 0;
    let skippedCount = 0;
    
    for (const roleData of commonRoles) {
      // Check if role already exists
      const existingRole = await RoleDefinition.findOne({ 
        normalizedName: roleData.normalizedName 
      });
      
      if (!existingRole) {
        await RoleDefinition.create(roleData);
        seededCount++;
        console.log(`✅ Added: ${roleData.roleName}`);
      } else {
        skippedCount++;
        console.log(`⏭️  Skipped: ${roleData.roleName} (already exists)`);
      }
    }
    
    console.log(`🎉 Seeding complete! Added ${seededCount} roles, skipped ${skippedCount} existing roles.`);
    
    return { seededCount, skippedCount, total: commonRoles.length };
  } catch (error) {
    console.error('❌ Error seeding role definitions:', error);
    throw error;
  }
}

// Function to get role statistics
export async function getRoleStats() {
  try {
    const stats = await RoleDefinition.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgUsage: { $avg: '$usageCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const totalRoles = await RoleDefinition.countDocuments();
    
    return {
      totalRoles,
      byCategory: stats,
      mostUsed: await RoleDefinition.find().sort({ usageCount: -1 }).limit(5)
    };
  } catch (error) {
    console.error('Error getting role stats:', error);
    throw error;
  }
}

export default { seedRoleDefinitions, getRoleStats };
