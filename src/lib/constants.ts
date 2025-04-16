// Available locations
export const LOCATIONS = {
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
    'Wisconsin', 'Wyoming'
  ],
  'Canada': [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan'
  ],
  'England': [
    'East Midlands', 'East of England', 'London', 'North East', 'North West', 
    'South East', 'South West', 'West Midlands', 'Yorkshire and the Humber'
  ]
} as const;

// Technical roles to track
export const TECH_ROLES = [
  'Senior Java Developer',
  'Java Architect',
  '.NET Solutions Architect',
  'Senior .NET Developer',
  'Enterprise Software Engineer',
  'Full Stack Java Developer',
  'Full Stack .NET Developer',
  'Software Development Engineer',
  'Cloud Solutions Architect',
  'DevOps Engineer',
  'Security Engineer',
  'Data Engineer',
  'Frontend Developer',
  'Backend Developer'
] as const;

// Technical skills and frameworks
export const TECHNICAL_SKILLS = new Set([
  // Enterprise Languages & Frameworks
  'java', 'spring', 'springboot', 'hibernate', 'junit', 'maven', 'gradle',
  'csharp', 'dotnet', 'aspnet', 'entityframework', 'blazor', 'xamarin',
  'vbnet', 'fsharp', 'wcf', 'webapi', 'linq', 'nunit', 'xunit',
  
  // Enterprise Databases
  'oracle', 'sqlserver', 'postgresql', 'mysql', 'mongodb', 'redis',
  'cassandra', 'elasticsearch', 'dynamodb', 'cosmosdb',
  
  // Enterprise Integration
  'soap', 'rest', 'graphql', 'grpc', 'kafka', 'rabbitmq', 'activemq',
  'servicebus', 'biztalk', 'mulesoft', 'apacheflink', 'tibco',
  
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform',
  'ansible', 'circleci', 'github', 'gitlab', 'nginx', 'apache', 'iis',
  
  // Web Technologies
  'javascript', 'typescript', 'react', 'angular', 'vue', 'jquery',
  'bootstrap', 'tailwind', 'sass', 'webpack', 'babel',
  
  // Testing & Quality
  'selenium', 'junit', 'nunit', 'xunit', 'mstest', 'specflow',
  'cucumber', 'postman', 'soapui', 'jmeter', 'gatling',
  
  // Architecture & Patterns
  'microservices', 'eventdriven', 'cqrs', 'ddd', 'tdd', 'cleancode',
  'solidprinciples', 'designpatterns', 'oauth', 'jwt',
  
  // Enterprise Tools
  'jira', 'confluence', 'bitbucket', 'azuredevops', 'teamcity',
  'octopus', 'sonarqube', 'fortify', 'splunk', 'newrelic',
  
  // Additional Skills
  'python', 'nodejs', 'php', 'ruby', 'golang', 'rust',
  'android', 'ios', 'flutter', 'reactnative',
]);

// Soft skills and methodologies
export const SOFT_SKILLS = new Set([
  // Leadership & Management
  'leadership', 'management', 'mentoring', 'coaching', 'delegation',
  
  // Communication
  'communication', 'presentation', 'negotiation', 'documentation',
  
  // Collaboration
  'teamwork', 'collaboration', 'coordination', 'facilitation',
  
  // Problem Solving
  'problemsolving', 'analytical', 'research', 'troubleshooting', 'debugging',
  
  // Project Management
  'agile', 'scrum', 'kanban', 'waterfall', 'planning', 'estimation',
  
  // Personal Qualities
  'initiative', 'adaptability', 'creativity', 'innovation', 'reliability',
  
  // Business Skills
  'strategy', 'budgeting', 'stakeholder', 'requirements', 'analysis',
  
  // Learning & Growth
  'learning', 'growth', 'improvement', 'development', 'training',
  
  // Time Management
  'timemanagement', 'prioritization', 'organization', 'efficiency',
  
  // Critical Thinking
  'criticalthinking', 'decisionmaking', 'evaluation', 'assessment',
]);

// Words to exclude
export const EXCLUDED_WORDS = new Set([
  // Common verbs
  'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
  
  // Articles and prepositions
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  
  // Common job description words
  'required', 'preferred', 'must', 'should', 'will', 'can', 'able', 'years',
  'experience', 'work', 'working', 'job', 'position', 'candidate', 'role',
  'responsibilities', 'qualifications', 'skills', 'knowledge', 'degree',
  'background', 'plus', 'minimum', 'maximum', 'etc', 'including',
  
  // Common technical terms when used in general context
  'system', 'software', 'application', 'data', 'code', 'program', 'development',
  'implementation', 'design', 'solution', 'platform', 'environment',
]);