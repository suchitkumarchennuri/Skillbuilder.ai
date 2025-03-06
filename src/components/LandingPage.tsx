import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileSearch, 
  LinkedinIcon, 
  FileEdit, 
  BarChart3, 
  ArrowRight,
  Upload,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { CardSpotlight } from './ui/CardSpotlight';

function BackgroundBeams() {
  const beams = [
    { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
    { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4 },
    { initialX: 100, translateX: 100, duration: 7, repeatDelay: 7, className: "h-6" },
    { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
    { initialX: 800, translateX: 800, duration: 11, repeatDelay: 2, className: "h-20" },
    { initialX: 1000, translateX: 1000, duration: 4, repeatDelay: 2, className: "h-12" },
    { initialX: 1200, translateX: 1200, duration: 6, repeatDelay: 4, delay: 2, className: "h-6" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {beams.map((beam, index) => (
        <motion.div
          key={index}
          initial={{
            translateY: "-200px",
            translateX: beam.initialX,
          }}
          animate={{
            translateY: "1800px",
            translateX: beam.translateX,
          }}
          transition={{
            duration: beam.duration,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
            delay: beam.delay,
            repeatDelay: beam.repeatDelay,
          }}
          className={cn(
            "absolute left-0 top-20 m-auto h-14 w-px rounded-full",
            "bg-gradient-to-t from-primary-500 via-accent-500 to-transparent opacity-50",
            beam.className
          )}
        />
      ))}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { 
  icon: React.ElementType, 
  title: string, 
  description: string 
}) {
  return (
    <CardSpotlight>
      <div className="h-12 w-12 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-lg flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
      <p className="text-dark-300">{description}</p>
    </CardSpotlight>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      {/* Navigation */}
      <nav className="border-b border-dark-800/50 backdrop-blur-lg bg-dark-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-primary-500 animate-pulse-slow" />
              <span className="text-xl font-bold gradient-text">SkillBridge AI</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="btn-secondary"
              >
                Log In
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="btn-primary"
              >
                Sign Up
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6 text-white" />
                ) : (
                  <Menu className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4">
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={() => {
                    navigate('/login');
                    setIsMenuOpen(false);
                  }}
                  className="btn-secondary w-full"
                >
                  Log In
                </button>
                <button 
                  onClick={() => {
                    navigate('/login');
                    setIsMenuOpen(false);
                  }}
                  className="btn-primary w-full"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative">
        <BackgroundBeams />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="relative">
                <span className="relative z-10 gradient-text">Bridge Your Skills Gap</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-primary-500/20 blur-xl" />
              </span>
              <br />
              <span className="text-white">with AI Intelligence</span>
            </motion.h1>
            <motion.p 
              className="text-lg sm:text-xl text-dark-300 mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Analyze your resume, optimize your LinkedIn profile, and get personalized insights to land your dream job.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <button 
                onClick={() => navigate('/login')}
                className="btn-primary group"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 inline-block group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="btn-secondary">
                Learn More
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-12">
          Powerful Features to Accelerate Your Career
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={FileSearch}
            title="Resume Inspection"
            description="Get detailed analysis of your resume against job descriptions with interactive word clouds and skill matching."
          />
          <FeatureCard
            icon={LinkedinIcon}
            title="LinkedIn Analyzer"
            description="Receive comprehensive insights and optimization tips for your LinkedIn profile to stand out."
          />
          <FeatureCard
            icon={FileEdit}
            title="Resume Tailoring"
            description="Generate AI-powered bullet points perfectly aligned with your target job descriptions."
          />
          <FeatureCard
            icon={BarChart3}
            title="Job Analytics"
            description="Access market insights and trends to make informed decisions about your career path."
          />
        </div>
      </div>

      {/* Benefits Section */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-accent-500/5 to-primary-500/5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
                Why Choose SkillBridge AI?
              </h2>
              <div className="space-y-4">
                {[
                  "AI-powered analysis for precise skill gap identification",
                  "Personalized recommendations for career growth",
                  "Real-time job market insights and trends",
                  "Time-saving automated resume optimization"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3 text-dark-200">
                    <CheckCircle2 className="h-6 w-6 text-primary-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="mt-8 btn-primary"
              >
                Get Started
              </button>
            </div>
            <div className="relative mt-10 lg:mt-0">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                alt="Team collaboration"
                className="rounded-lg shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -right-6 card p-4 hidden sm:block">
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-primary-500" />
                  <span className="text-sm font-medium text-white">
                    Upload your resume to get started
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}