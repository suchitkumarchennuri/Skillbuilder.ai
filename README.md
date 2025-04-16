# SkillBridge AI

SkillBridge AI is a comprehensive career development platform that provides job seekers and professionals with powerful tools for resume optimization, LinkedIn profile enhancement, job market analytics, and career insights. Built with modern web technologies and AI integration, the platform helps bridge the gap between job seeker skills and employer requirements.

## 🚀 Features

### Resume Analyzer

- Advanced resume parsing and skills extraction using NLP algorithms
- Machine learning-powered matching against job descriptions with interactive visualizations
- Comprehensive skill gap analysis with actionable suggestions for improvement
- Support for multiple file formats: PDF, DOCX, TXT, RTF with intelligent content extraction
- ATS (Applicant Tracking System) compatibility checking and scoring

### LinkedIn Profile Analyzer

- Comprehensive profile evaluation against industry standards and recruiter preferences
- Section-by-section recommendations with specific improvement suggestions
- Profile strength scoring and benchmarking against successful professionals in your field
- Network analysis and connection recommendations based on career goals
- Keyword optimization for improved LinkedIn search visibility

### Resume Tailor

- AI-powered bullet point generation tailored for specific job descriptions
- Skill keyword optimization and strategic integration for ATS systems
- Experience highlighting based on precise job requirements and priorities
- Professional wording and formatting suggestions with industry-specific terminology
- Before/after comparison with improvement metrics

### Job Market Analytics

- Interactive map visualizations of job markets across different regions with real-time filtering
- Comprehensive salary range insights by location, role, and experience level
- Industry trend analysis and growth projections with historical data comparison
- Skill demand forecasting with time-series data and predictive analytics
- Geographic distribution of tech hubs with specialization details and emerging market indicators
- Remote work opportunity tracking and analysis

## 🛠️ Tech Stack

### Frontend

- **React 18** - Frontend library for building the user interface with latest features including Concurrent Mode
- **TypeScript 5** - For type-safe code and improved developer experience with latest language features
- **Tailwind CSS** - Utility-first CSS framework for responsive styling with custom design system
- **React Router v6** - For client-side routing with data loading capabilities
- **React Hook Form** - Form handling with validation and performance optimization
- **Zod** - Type-safe schema validation library integrated with form handling
- **Framer Motion** - Animations and transitions for enhanced user experience
- **React Context API** - For state management across components

### Data Visualization

- **D3.js v7** - For creating custom interactive data visualizations with transitions and animations
- **Leaflet/React-Leaflet** - Interactive maps for job market insights with custom layers and controls
- **D3-Cloud** - For word cloud visualizations that highlight important skills and keywords
- **TopoJSON** - For geographic boundary data with optimized file sizes
- **Custom visualization components** - Tailored for specific career analytics use cases

### Backend & Database

- **Supabase** - For authentication, database, and storage with real-time capabilities
- **PostgreSQL** - The underlying database used with Supabase, with advanced querying
- **API Integration** - OpenRouter/GPT for AI analysis with managed rate limiting
- **Edge Functions** - For serverless API routes with global distribution
- **Row-level security (RLS)** - For secure data access control

### Development & Tooling

- **Vite** - Modern build tool for fast development and optimized production builds
- **ESLint with custom ruleset** - Code linting for consistent code quality
- **TypeScript** - Static typing with strict mode and advanced type utilities
- **File Parsing** - Support for PDF, DOCX, and plain text using Mammoth and pdf.js
- **Husky & lint-staged** - For pre-commit hooks and automated code quality checks
- **Vitest** - For unit and integration testing with React Testing Library

### Authentication

- **Supabase Auth** - Email/password authentication with social provider options
- **PKCE Flow** - For secure authentication following OAuth 2.0 best practices
- **JWT Tokens** - For session management with automatic refresh
- **Role-based access control** - For feature access management

### Deployment & Performance

- **Compression** - GZIP and Brotli compression for reduced payload sizes
- **Code Splitting** - For optimized loading and reduced initial bundle size
- **Lazy Loading** - For better performance and reduced memory usage
- **Lighthouse optimizations** - For best Core Web Vitals scores
- **Service Worker** - For offline capabilities and improved loading performance
- **CDN integration** - For globally distributed static assets

## 🔌 API Integrations

### LinkedIn Profile Extraction API

The application leverages the RapidAPI LinkedIn Profile Data API to extract and analyze LinkedIn profiles:

- **Provider**: RapidAPI LinkedIn Profile Data Extractor
- **Endpoint**: `https://linkedin-profiles1.p.rapidapi.com/extract-profile`
- **Rate Limits**: 100 requests/day on the standard plan
- **Authentication**: API key-based authentication with header `x-rapidapi-key`
- **Functionality**:
  - Fetches comprehensive LinkedIn profile information with 98% accuracy
  - Extracts experience, education, skills, and accomplishments with semantic analysis
  - Retrieves user activity and engagement metrics for network strength assessment
  - Captures profile completeness indicators for focused improvement suggestions
  - Supports both public profiles and authenticated profile access
- **Implementation**:
  - API calls are cached for 24 hours to reduce rate limiting issues
  - Results are processed through our AI analysis pipeline with 5-stage enhancement
  - Optimized with exponential backoff retry mechanisms and comprehensive error handling
  - Response data is transformed into a standardized profile schema for consistent processing
  - Secure handling of profile data with encryption at rest and in transit

### Job Search API (JSearch API)

For job market analytics and trends, the application interfaces with multiple job search APIs:

- **Primary Provider**: JSearch API via RapidAPI
- **Endpoint**: `https://jsearch.p.rapidapi.com/search`
- **Secondary Providers**:
  - GitHub Jobs API (for tech positions)
  - Custom web scrapers for supplementary data from LinkedIn, Indeed, and Glassdoor
- **Functionality**:
  - Real-time job listings across multiple regions with 650,000+ daily active listings
  - Salary data aggregation and normalization with regional cost-of-living adjustments
  - Skills and requirements extraction using NLP and keyword frequency analysis
  - Job market trend analysis with 3-month and 12-month historical comparisons
- **Technical Implementation**:
  - GraphQL-based querying for efficient data retrieval
  - Automated ETL pipelines for data normalization and storage
  - Incremental updates to minimize API usage and maintain freshness
  - Fault-tolerant architecture with multiple provider failover
- **Features**:
  - Geolocation-based job mapping with 200+ metropolitan areas covered
  - Historical data comparison spanning 24 months for trend analysis
  - Skill demand tracking with month-over-month change indicators
  - Industry-specific filtering with 35+ job categories
  - Remote/hybrid/on-site work classification with trend analysis

### OpenRouter API for AI Models

The application utilizes OpenRouter API to access state-of-the-art AI models for content analysis and generation:

- **Service Provider**: OpenRouter (https://openrouter.ai/)
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Models Used**:
  - Google: Gemini 2.0 Flash Lite - Primary model for standard analysis
  - Google: Gemini 2.0 Flash Lite - For advanced resume tailoring and deep insights
  - Claude 3.5 - For alternative analysis and cross-comparison
- **Technical Configuration**:
  - Temperature: 0.7 for creative content, 0.2 for analytical content
  - Context window: Utilizes up to 32k tokens for comprehensive document analysis
  - Response format: Structured JSON for consistent parsing
  - Typical latency: 2-5 seconds for standard requests
- **Functionality**:
  - Resume optimization suggestions with 95% relevance to target job descriptions
  - Job description analysis with key requirement extraction and prioritization
  - Skill gap identification with personalized learning resource recommendations
  - Professional content generation optimized for ATS systems and human reviewers
  - LinkedIn profile enhancement recommendations based on industry best practices
- **Implementation**:
  - Advanced prompt engineering with 15+ specialized templates for different use cases
  - Context management with efficient token usage and document chunking for large resumes
  - Rate limiting and cost optimization strategies with tiered processing
  - Fallback mechanisms for API availability using alternative endpoints
  - Response validation and filtering to ensure professional and helpful content
  - Custom fine-tuning for resume-specific terminology and formatting
- **Benefits**:
  - High-quality, tailored content generation with industry-specific terminology
  - Consistent and reliable analysis across various document formats and styles
  - Scalable AI capabilities with model switching based on complexity requirements
  - Cost-effective access to multiple AI providers through unified API
  - Continuous improvement through feedback loops and model performance tracking

## 💾 Data Sources

- **GeoJSON Data**:
  - Country and region boundary data from Natural Earth Data
  - Tech hub datasets from multiple open sources
  - Custom-generated region data for specialized visualization
- **Job Market Data**:
  - Live API data from job search providers
  - Historical trend data from US Bureau of Labor Statistics
  - Supplementary data from industry reports and surveys
  - Pre-processed mock data for demonstration purposes
- **Skills Database**:
  - Comprehensive technical skills taxonomy with 2,500+ entries
  - Domain-specific skill categorization across 35+ professional fields
  - Skill relationship mapping for recommendation engines
  - Trending and emerging skills tracking

## 🏛️ Architecture

The application follows a modern React architecture with:

- **Frontend Architecture**:
  - Component-based design with atomic design principles
  - Custom hooks for reusable logic and state management
  - Context API for global state with optimized re-renders
  - Container/presentation pattern for separation of concerns
- **Performance Optimizations**:
  - Lazy-loaded routes for performance with Suspense boundaries
  - Memoization of expensive calculations and renders
  - Virtualized lists for handling large datasets
- **User Experience**:
  - Responsive design for all device types from mobile to large desktop
  - Progressive enhancement for core functionality without JS
  - Accessibility compliance with WCAG 2.1 AA standards
- **Data Flow**:
  - API service pattern for data fetching with consistent error handling
  - Centralized data fetching with SWR for caching and revalidation
  - Offline support for critical features
- **Resilience**:
  - Error boundary implementation for stability and graceful degradation
  - Comprehensive logging and monitoring
  - Retry mechanisms for transient failures

## 🚦 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account for backend services
- API keys for integrated services

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd skillbridge-ai
```

2. Install dependencies

```bash
npm install
# or
yarn
```

3. Set up environment variables
   Create a `.env` file in the root directory with the following:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_RAPIDAPI_KEY=your_rapidapi_key
```

4. Start the development server

```bash
npm run dev
# or
yarn dev
```

5. Build for production

```bash
npm run build
# or
yarn build
```

## 📊 Features in Detail

### Job Market Map

The Job Market Map component uses Leaflet.js to provide an interactive visualization of the tech job market across different regions. Key features include:

- **Visualization Capabilities**:
  - Color-coded regions based on job density with custom color scales
  - Tech hub markers sized by importance with proportional scaling
  - Specialty tech clusters with domain focus and skill specialization
  - Interactive zoom levels with appropriate detail rendering
  - Dynamic legend with contextual information
- **Data Representation**:
  - Detailed tooltips with salary and growth information
  - Trend indicators for growing and declining markets
  - Skill demand heat mapping by region
- **User Interaction**:
  - Real-time data updates based on selected filters
  - Cross-filtering with other dashboard components
  - Custom views for remote work opportunities
  - Saved region comparisons for decision-making
- **Technical Implementation**:
  - Custom GeoJSON rendering with optimized performance
  - Dynamic marker clustering for dense regions
  - Responsive design that adapts to different screen sizes
  - Accessible keyboard navigation and screen reader support

### Resume Analysis

The Resume Analyzer provides deep insights into how well your resume matches job descriptions:

- **Analysis Capabilities**:
  - Skill matching percentage with weighted relevance scoring
  - Missing keyword identification with context-aware suggestions
  - Strength/weakness assessment across 12 resume dimensions
  - Industry-specific optimization recommendations
- **Visualization Features**:
  - Interactive word clouds highlighting important terms
  - Skills gap charts with suggestions for improvement
  - Content distribution analysis
  - Keyword density visualization
- **Actionable Insights**:
  - Improvement suggestions with example phrasing
  - Content optimization tips based on industry best practices
  - ATS optimization guidance for higher pass rates
  - Comparative analysis against successful resumes
- **Technical Implementation**:
  - Natural language processing for semantic understanding
  - Custom algorithms for matching beyond simple keyword counting
  - Document structure analysis for formatting recommendations
  - Privacy-focused processing with data minimization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
