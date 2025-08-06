import React, { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import emailjs from 'emailjs-com';
import mammoth from 'mammoth';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker?worker";

pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker();

import { Upload, Send, FileText, User, Mail, Loader2, CheckCircle, Eye } from 'lucide-react';

// Initialize EmailJS
emailjs.init("NZqsDOFGWUqDpZKyB"); // Replace with your EmailJS User ID

function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [extractedData, setExtractedData] = useState({ name: '', email: '', experience: '' });
  const [resumeFileForEmail, setResumeFileForEmail] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Extract text from PDF
  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      text += strings.join(' ') + ' ';
    }
    return text;
  };

  // Extract text from DOCX
  const extractTextFromDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  // Extract job title from job description using smart heuristics
  const extractJobTitle = (jobDescription) => {
    if (!jobDescription) return 'Position';
    
    const lines = jobDescription.split('\n').filter(line => line.trim());
    if (lines.length === 0) return 'Position';
    
    const firstLine = lines[0].trim();
    
    // If first line looks like a job title (short and doesn't contain code-like syntax)
    if (firstLine.length < 100 && 
        !firstLine.includes('import') && 
        !firstLine.includes('function') && 
        !firstLine.includes('const') && 
        !firstLine.includes('let') && 
        !firstLine.includes('var') && 
        !firstLine.includes('=') && 
        !firstLine.includes('{') && 
        !firstLine.includes('}')) {
      return firstLine;
    }
    
    // Look for common job title patterns in the description
    const jobTitlePatterns = [
      /(?:position|role|job)\s*:?\s*([^\n.]+)/i,
      /(?:we are looking for|seeking|hiring)\s+(?:a|an)?\s*([^\n.]+?)(?:\s+to|\s+who|\s+with|$)/i,
      /(?:job title|title)\s*:?\s*([^\n.]+)/i,
      /([a-zA-Z\s]+(?:engineer|developer|manager|analyst|specialist|coordinator|assistant|lead|senior|junior))/i
    ];
    
    for (const pattern of jobTitlePatterns) {
      const match = jobDescription.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/[.,;]$/, '');
      }
    }
    
    // Fallback: return first meaningful line that's not too long
    for (const line of lines) {
      if (line.length > 10 && line.length < 80 && 
          !line.includes('import') && 
          !line.includes('function') && 
          !line.includes('const')) {
        return line.trim();
      }
    }
    
    return 'Position';
  };

  // Parse resume data
  const parseResumeData = (text) => {
    // Extract name with improved pattern matching for full names
    const namePatterns = [
      /(?:Name[:\s]+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/,  // Full name pattern (up to 4 words)
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/m,  // Name at start of line
      /([A-Z][A-Z\s]+[A-Z])/,  // All caps name
    ];
    
    let name = '';
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        name = match[1].trim();
        break;
      }
    }

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const email = emailMatch ? emailMatch[0] : '';

    // Clean and extract experience and skills
    const cleanedData = extractExperienceAndSkills(text);

    return { 
      name: name.trim(), 
      email: email.trim(), 
      experience: cleanedData.experience,
      skills: cleanedData.skills,
      summary: cleanedData.summary
    };
  };

  // Extract and clean experience and skills using heuristics
  const extractExperienceAndSkills = (text) => {
    // Clean the text first
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Extract years of experience
    const yearsMatch = cleanText.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi);
    const yearsOfExp = yearsMatch ? yearsMatch[0] : null;
    
    // Extract skills section
    const skillsPatterns = [
      /(?:SKILLS|Skills|TECHNICAL SKILLS|Technical Skills)[:\s]+(.*?)(?=\n[A-Z]{2,}|\n\n|$)/gi,
      /(?:Languages|Programming Languages|Technologies)[:\s]+(.*?)(?=\n[A-Z]{2,}|\n\n|$)/gi,
      /(?:Tools|Frameworks|Libraries)[:\s]+(.*?)(?=\n[A-Z]{2,}|\n\n|$)/gi
    ];
    
    let skillsText = '';
    for (const pattern of skillsPatterns) {
      const matches = cleanText.match(pattern);
      if (matches) {
        skillsText += matches.map(match => match.split(':')[1]?.trim()).join(', ');
      }
    }
    
    // Clean skills text
    const skills = skillsText
      .replace(/[•\-\*]/g, '')
      .split(/[,\n]/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 1 && skill.length < 30)
      .slice(0, 8) // Limit to top 8 skills
      .join(', ');
    
    // Extract work experience/projects
    const experiencePatterns = [
      /(?:EXPERIENCE|Experience|WORK EXPERIENCE|Work Experience)[:\s]+(.*?)(?=\n(?:EDUCATION|SKILLS|PROJECTS)|$)/gi,
      /(?:PROJECTS|Projects)[:\s]+(.*?)(?=\n(?:EDUCATION|SKILLS|EXPERIENCE)|$)/gi
    ];
    
    let experienceText = '';
    for (const pattern of experiencePatterns) {
      const matches = cleanText.match(pattern);
      if (matches) {
        experienceText += matches.map(match => match.split(':')[1]?.trim()).join(' ');
      }
    }
    
    // Extract job titles and companies
    const jobTitles = cleanText.match(/(?:Intern|Engineer|Developer|Analyst|Manager|Specialist|Consultant|Associate)\s*(?:at|@|\-)\s*([A-Za-z\s&]+)/gi) || [];
    const companies = jobTitles.map(title => title.split(/at|@|\-/)[1]?.trim()).filter(Boolean).slice(0, 3);
    
    // Create a clean summary
    let summary = '';
    if (yearsOfExp) {
      summary += `${yearsOfExp} `;
    } else if (jobTitles.length > 0) {
      summary += 'professional experience ';
    } else {
      summary += 'background ';
    }
    
    if (skills) {
      const topSkills = skills.split(',').slice(0, 4).join(',');
      summary += `in ${topSkills}`;
    }
    
    if (companies.length > 0) {
      summary += `, including work at ${companies.slice(0, 2).join(' and ')}`;
    }
    
    return {
      experience: yearsOfExp || 'relevant professional experience',
      skills: skills || 'technical skills and programming languages',
      summary: summary.trim() || 'strong technical background and relevant experience'
    };
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setResumeFile(file);
    setIsUploading(true);
    setIsParsing(true);

    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDOCX(file);
      } else {
        throw new Error('Unsupported file format. Please upload PDF or DOCX files.');
      }

      const parsedData = parseResumeData(text);
      setExtractedData(parsedData);
      setResumeFileForEmail(file);

      toast.success('Resume parsed successfully!', {
        style: { background: '#fff', color: '#22c55e' }
      });
    } catch (error) {
      toast.error(`Error parsing resume: ${error.message}`, {
        style: { background: '#fff', color: '#ef4444' }
      });
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  // Generate email templates
  const generateEmailTemplates = () => {
    if (!extractedData.name || !extractedData.email || !jobDescription) {
      toast.error('Please upload resume and enter job description', {
        style: { background: '#fff', color: '#ef4444' }
      });
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const jobTitle = extractJobTitle(jobDescription);
      
      const templates = [
        {
          id: 1,
          title: 'Professional & Direct',
          subject: `Application for ${jobTitle}`,
          body: `Dear Hiring Manager,

I hope this email finds you well. I am writing to express my strong interest in the ${jobTitle} position at your esteemed organization.

With my background and experience, I believe I would be a valuable addition to your team. My ${extractedData.summary || extractedData.experience} aligns well with the requirements outlined in your job posting.

I have attached my resume for your review and would welcome the opportunity to discuss how my skills and enthusiasm can contribute to your team's success.

Thank you for your time and consideration. I look forward to hearing from you soon.

Best regards,
${extractedData.name}
${extractedData.email}`
        },
        {
          id: 2,
          title: 'Enthusiastic & Personal',
          subject: `Excited to Apply - ${jobTitle}`,
          body: `Dear Hiring Team,

I am thrilled to submit my application for the ${jobTitle} role. Your job posting immediately caught my attention, and I am genuinely excited about the possibility of contributing to your organization.

What particularly excites me about this opportunity is the chance to apply my skills in a dynamic environment. My ${extractedData.summary || extractedData.experience} has prepared me well for this role, and I am eager to bring my passion and dedication to your team.

I would love the opportunity to discuss how my background, skills, and enthusiasm can benefit your organization. Please find my resume attached for your consideration.

Thank you for your time, and I hope to hear from you soon!

Warm regards,
${extractedData.name}
${extractedData.email}`
        },
        {
          id: 3,
          title: 'Skills-Focused',
          subject: `${extractedData.name} - Application for ${jobTitle}`,
          body: `Dear Hiring Manager,

I am writing to apply for the ${jobTitle} role at your company. After reviewing the job requirements, I am confident that my skills and experience make me an ideal candidate.

Key highlights of my qualifications:
• ${extractedData.summary || extractedData.experience}
${extractedData.skills ? `• Technical expertise in ${extractedData.skills}` : '• Strong technical skills'}
• Proven track record of delivering results
• Strong communication and problem-solving abilities
• Eager to contribute to team success

I am impressed by your company's commitment to excellence and would be honored to contribute to your continued success. My resume is attached for your detailed review.

I would welcome the opportunity to discuss my application further at your convenience.

Thank you for your consideration.

Sincerely,
${extractedData.name}
${extractedData.email}`
        },
        {
          id: 4,
          title: 'Company-Focused',
          subject: `Interest in Joining Your Team - ${jobTitle}`,
          body: `Dear Hiring Team,

I am writing to express my sincere interest in the ${jobTitle} role at your organization. Having researched your company, I am truly impressed by your mission, values, and innovative approach to business.

Your commitment to excellence aligns perfectly with my professional values and career aspirations. My ${extractedData.summary || extractedData.experience} has equipped me with the skills necessary to contribute meaningfully to your team from day one.

I am particularly drawn to this opportunity because it would allow me to grow professionally while contributing to an organization I genuinely admire. I have attached my resume and would be delighted to discuss how I can contribute to your team's continued success.

Thank you for considering my application. I look forward to the possibility of joining your exceptional team.

Best regards,
${extractedData.name}
${extractedData.email}`
        },
        {
          id: 5,
          title: 'Achievement-Oriented',
          subject: `Results-Driven Professional - ${jobTitle} Application`,
          body: `Dear Hiring Manager,

I am pleased to submit my application for the ${jobTitle} role. As a results-driven professional, I am excited about the opportunity to bring my proven track record of success to your dynamic team.

Throughout my career, I have consistently delivered exceptional results and exceeded expectations. My ${extractedData.summary || extractedData.experience} demonstrates my ability to contribute significantly to your organization's goals.

What sets me apart:
• Proven ability to deliver measurable results
• Strong analytical and problem-solving skills  
• Excellent collaboration and leadership capabilities
• Commitment to continuous improvement and innovation

I am confident that my background and achievements make me a strong candidate for this position. Please find my resume attached for your review.

I would appreciate the opportunity to discuss how my results-oriented approach can benefit your team.

Thank you for your time and consideration.

Professionally yours,
${extractedData.name}
${extractedData.email}`
        },
        {
          id: 6,
          title: 'Future-Oriented',
          subject: `Ready to Contribute - ${jobTitle} Application`,
          body: `Dear Hiring Team,

I am writing to apply for the ${jobTitle} at your forward-thinking organization. I am excited about the opportunity to contribute to your team's future success and growth.

Your company's vision for the future resonates strongly with my professional goals and aspirations. My ${extractedData.summary || extractedData.experience} has prepared me to tackle the challenges and opportunities that lie ahead in this role.

I am particularly excited about:
• Contributing to innovative projects and solutions
• Collaborating with talented professionals
• Growing and developing in a dynamic environment
• Making a meaningful impact on your organization's success

I believe that my combination of skills, enthusiasm, and forward-thinking approach would make me a valuable addition to your team. My resume is attached for your consideration.

I would love the opportunity to discuss how I can contribute to your organization's bright future.

Thank you for your consideration, and I look forward to hearing from you.

Best wishes,
${extractedData.name}
${extractedData.email}`
        }
      ];

      setEmailTemplates(templates);
      setShowTemplates(true);
      setIsGenerating(false);
      toast.success('Email templates generated successfully!', {
        style: { background: '#fff', color: '#22c55e' }
      });
    }, 2000);
  };

  // Send email using EmailJS
  const sendEmail = async (template) => {
    if (!hrEmail) {
      toast.error('Please enter HR email address', {
        style: { background: '#fff', color: '#ef4444' }
      });
      return;
    }

    setIsSending(true);

    try {
      // Convert resume file to base64 for attachment
      let resumeAttachment = null;
      if (resumeFileForEmail) {
        const reader = new FileReader();
        const fileData = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(resumeFileForEmail);
        });
        
        resumeAttachment = {
          name: resumeFileForEmail.name,
          data: fileData.split(',')[1], // Remove data:application/pdf;base64, prefix
          type: resumeFileForEmail.type
        };
      }

      const templateParams = {
        to_email: hrEmail,
        from_email: extractedData.email,
        from_name: extractedData.name,
        subject: template.subject,
        message: template.body,
        reply_to: extractedData.email,
        
      };

      // Replace with your EmailJS service ID and template ID
      await emailjs.send(
        'service_ve1r72b',     // Replace with your EmailJS Service ID
        'template_r0cmqod',    // Replace with your EmailJS Template ID
        templateParams
      );

      toast.success('Email sent successfully!', {
        style: { background: '#fff', color: '#22c55e' }
      });
    } catch (error) {
      toast.error(`Failed to send email: ${error.text || error.message}`, {
        style: { background: '#fff', color: '#ef4444' }
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTemplatePreview = (template) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="min-h-screen <div className="min-h-screen bg-gradient-to-br from-orange-400 to-white text-gray-800"> text-gray-800">
    
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Mail className="mx-auto mb-4 h-12 w-12" />
            <h1 className="text-4xl font-bold mb-2">Email Template Generator</h1>
            <p className="text-orange-100">Upload your resume, generate personalized email templates, and send them directly to HR</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          
          {/* Step 1: Upload Resume */}
          <div className="bg-white rounded-lg shadow-lg border p-6 mb-6">
            <div className="flex items-center mb-4">
              <FileText className="h-6 w-6 text-orange-500 mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">Step 1: Upload Resume</h2>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
                disabled={isUploading || isParsing}
              />
              <label
                htmlFor="resume-upload"
                className={`cursor-pointer inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors ${
                  (isUploading || isParsing) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading || isParsing ? (
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <Upload className="h-5 w-5 mr-2" />
                )}
                {isUploading ? 'Uploading...' : isParsing ? 'Parsing...' : 'Upload Resume (PDF/DOCX)'}
              </label>
              
              {resumeFile && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-700 font-medium">✓ {resumeFile.name} uploaded successfully</p>
                </div>
              )}
              
              {extractedData.name && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <User className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="font-medium text-blue-700">Extracted Information:</span>
                  </div>
                  <div className="text-left text-blue-600">
                    <p><strong>Name:</strong> {extractedData.name}</p>
                    <p><strong>Email:</strong> {extractedData.email}</p>
                    {extractedData.summary && (
                      <p><strong>Summary:</strong> {extractedData.summary}</p>
                    )}
                    {extractedData.skills && (
                      <p><strong>Skills:</strong> {extractedData.skills}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Job Details */}
          <div className="bg-white rounded-lg shadow-lg border p-6 mb-6">
            <div className="flex items-center mb-4">
              <Mail className="h-6 w-6 text-orange-500 mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">Step 2: Job Details</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description or Position Title
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Enter job title (e.g., 'Software Engineer at Google') or paste the full job description..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  💡 Tip: For best results, start with the job title or paste the complete job description
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Email Address
                </label>
                <input
                  type="email"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  placeholder="hr@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Generate Templates */}
          <div className="bg-white rounded-lg shadow-lg border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Send className="h-6 w-6 text-orange-500 mr-2" />
                <h2 className="text-2xl font-bold text-gray-800">Step 3: Generate Email Templates</h2>
              </div>
              
              <button
                onClick={generateEmailTemplates}
                disabled={isGenerating || !extractedData.name || !jobDescription}
                className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <FileText className="h-5 w-5 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Templates'}
              </button>
            </div>
            
            {!extractedData.name && (
              <p className="text-gray-500 text-center py-4">Please upload your resume first</p>
            )}
          </div>

          {/* Step 4: Email Templates */}
          {showTemplates && emailTemplates.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg border p-6 mb-6">
              <div className="flex items-center mb-6">
                <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                <h2 className="text-2xl font-bold text-gray-800">Step 4: Choose & Send Email Template</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {emailTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleTemplatePreview(template)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">{template.title}</h3>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{template.subject}</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplatePreview(template);
                        }}
                        className="flex-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendEmail(template);
                        }}
                        disabled={isSending}
                        className="flex-1 px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        {isSending ? '...' : 'Send'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template Preview Modal */}
          {selectedTemplate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{selectedTemplate.title}</h3>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
                    <p className="p-2 bg-gray-50 rounded text-gray-800">{selectedTemplate.subject}</p>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Body:</label>
                    <div className="p-4 bg-gray-50 rounded whitespace-pre-wrap text-gray-800 max-h-60 overflow-y-auto">
                      {selectedTemplate.body}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        sendEmail(selectedTemplate);
                        setSelectedTemplate(null);
                      }}
                      disabled={isSending}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors inline-flex items-center justify-center"
                    >
                      {isSending ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {isSending ? 'Sending...' : 'Send Email'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 Email Template Generator. Create professional emails effortlessly.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
