import { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import emailjs from 'emailjs-com'
import mammoth from 'mammoth'
import { Upload, Send, FileText, User, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

// App.jsx or similar
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker?worker";

pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker();

function App() {
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [hrEmail, setHrEmail] = useState('')
  const [generatedEmail, setGeneratedEmail] = useState(null)
  const [extractedData, setExtractedData] = useState(null)

  // EmailJS configuration
  const SERVICE_ID = 'service_lh9bb1l'
  const TEMPLATE_ID = 'template_r0cmqod'
  const USER_ID = 'NZqsDOFGWUqDpZKyB'

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0]

    if (!file) return

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid PDF or DOCX resume', {
        style: {
          background: '#FEE2E2',
          color: '#DC2626',
          borderLeft: '4px solid #DC2626'
        },
        icon: <AlertCircle className="text-red-600" />
      })
      event.target.value = ''
      return
    }

    setResumeFile(file)
    setIsProcessing(true)

    toast.loading('Processing your resume...', {
      id: 'processing',
      style: {
        background: '#FFF7ED',
        color: '#FF6B35',
        borderLeft: '4px solid #FF6B35'
      }
    })

    try {
      let text = ''

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          const textContent = await page.getTextContent()
          text += textContent.items.map(item => item.str).join(' ') + '\n'
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        text = result.value
      }

      setResumeText(text.trim())
      const data = extractResumeData(text.trim())
      setExtractedData(data)

      toast.dismiss('processing')
      toast.success('Resume processed successfully!', {
        style: {
          background: '#F0FDF4',
          color: '#16A34A',
          borderLeft: '4px solid #16A34A'
        },
        icon: <CheckCircle className="text-green-600" />
      })
    } catch (error) {
      console.error('File parse error:', error)
      toast.dismiss('processing')
      toast.error('Error reading file. Please try again.', {
        style: {
          background: '#FEE2E2',
          color: '#DC2626',
          borderLeft: '4px solid #DC2626'
        },
        icon: <AlertCircle className="text-red-600" />
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const extractResumeData = (text) => {
    const data = {
      fullName: 'Not Provided',
      email: 'Not Provided',
      phone: 'Not Provided',
      skills: [],
      experience: [],
      currentRole: 'Not Provided',
    }

    // Extract name (first line or first capitalized words)
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const nameMatch = lines[0]?.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m)
    if (nameMatch) {
      data.fullName = nameMatch[1].trim()
    } else {
      const altNameMatch = text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m)
      if (altNameMatch) data.fullName = altNameMatch[1].trim()
    }

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailMatch) data.email = emailMatch[1]

    // Extract phone
    const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{10,})/g)
    if (phoneMatch) {
      const validPhone = phoneMatch.find(p => p.replace(/\D/g, '').length >= 10)
      if (validPhone) data.phone = validPhone.trim()
    }

    // Extract current role
    const roleRegex = /(Software Engineer|Developer|Manager|Analyst|Designer|Consultant|Lead|Senior|Junior)\s*[A-Za-z\s]*/gi
    const roleMatches = text.match(roleRegex)
    if (roleMatches && roleMatches.length > 0) {
      data.currentRole = roleMatches[0].trim()
    }

    // Extract skills
    const skillSection = text.match(/TECHNICAL SKILLS[\s\S]*?(?=(EXPERIENCE|EDUCATION|PROJECTS|ACHIEVEMENTS|$))/i)
    const commonSkills = [
      'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'HTML', 'CSS', 'SQL', 
      'MongoDB', 'AWS', 'Git', 'Docker', 'TypeScript', 'Angular', 'Vue.js', 
      'Express', 'Spring', 'Django', 'Flask', 'PostgreSQL', 'MySQL', 'Redis'
    ]
    
    if (skillSection) {
      const skillText = skillSection[0].toLowerCase()
      data.skills = commonSkills.filter(skill => 
        skillText.includes(skill.toLowerCase())
      ).slice(0, 8)
    } else {
      // Fallback: search entire text for skills
      const textLower = text.toLowerCase()
      data.skills = commonSkills.filter(skill => 
        textLower.includes(skill.toLowerCase())
      ).slice(0, 6)
    }

    // Extract experience
    const expSection = text.match(/(?:EXPERIENCE|WORK EXPERIENCE)[\s\S]*?(?=\n[A-Z]{2,}|EDUCATION|$)/i)
    if (expSection) {
      const companies = expSection[0].match(/([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Company|Technologies|Systems))/g)
      if (companies) {
        data.experience = companies.slice(0, 3)
      }
    }

    return data
  }

  const extractJobTitle = (text) => {
    const titleRegex = /(?:Job Title|Position|Role):\s*([^\n]+)/i
    const match = text.match(titleRegex)
    if (match) return match[1].trim()

    // Fallback: look for common job titles in the text
    const jobTitles = [
      'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
      'Data Scientist', 'Product Manager', 'UI/UX Designer', 'DevOps Engineer',
      'Mobile Developer', 'QA Engineer', 'Business Analyst', 'Project Manager'
    ]
    
    for (const title of jobTitles) {
      if (text.toLowerCase().includes(title.toLowerCase())) {
        return title
      }
    }

    return 'the advertised position'
  }

  const generateEmail = async () => {
    if (!resumeText.trim()) {
      toast.error('Please upload a resume first', {
        style: {
          background: '#FEE2E2',
          color: '#DC2626',
          borderLeft: '4px solid #DC2626'
        },
        icon: <AlertCircle className="text-red-600" />
      })
      return
    }

    if (!jobDescription.trim()) {
      toast.error('Please enter the job description', {
        style: {
          background: '#FEE2E2',
          color: '#DC2626',
          borderLeft: '4px solid #DC2626'
        },
        icon: <AlertCircle className="text-red-600" />
      })
      return
    }

    if (!hrEmail.trim()) {
      toast.error('Please enter the HR email address', {
        style: {
          background: '#FEE2E2',
          color: '#DC2626',
          borderLeft: '4px solid #DC2626'
        },
        icon: <AlertCircle className="text-red-600" />
      })
      return
    }

    setIsGenerating(true)
    toast.loading('Generating personalized email...', {
      id: 'generating',
      style: {
        background: '#FFF7ED',
        color: '#FF6B35',
        borderLeft: '4px solid #FF6B35'
      }
    })

    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 2000))

    const resumeData = extractedData || extractResumeData(resumeText)
    const jobTitle = extractJobTitle(jobDescription)

    const subject = `Application for ${jobTitle} Position`
    
    let body = `Dear Hiring Manager,\n\n`
    body += `I hope this email finds you well. My name is ${resumeData.fullName}, and I am writing to express my strong interest in the ${jobTitle} position at your esteemed organization.\n\n`

    if (resumeData.currentRole !== 'Not Provided') {
      body += `As a ${resumeData.currentRole}, I bring valuable experience and expertise to this role. `
    }

    if (resumeData.skills.length > 0) {
      body += `I have extensive experience working with ${resumeData.skills.join(', ')}, which aligns well with the requirements mentioned in the job description.\n\n`
    }

    body += `After reviewing the job description, I am confident that my skills and experience make me an ideal candidate for this position. I am particularly excited about the opportunity to contribute to your team and help drive innovation.\n\n`

    if (resumeData.experience.length > 0) {
      body += `My professional experience includes working with organizations such as ${resumeData.experience.slice(0, 2).join(' and ')}, where I have honed my skills and delivered impactful results.\n\n`
    }

    body += `I have attached my resume for your review and would welcome the opportunity to discuss how my background and enthusiasm can contribute to your team's success. I am available for an interview at your convenience.\n\n`
    body += `Thank you for considering my application. I look forward to hearing from you soon.\n\n`
    body += `Best regards,\n${resumeData.fullName}`

    if (resumeData.phone !== 'Not Provided') body += `\nPhone: ${resumeData.phone}`
    if (resumeData.email !== 'Not Provided') body += `\nEmail: ${resumeData.email}`

    const emailData = {
      to: hrEmail,
      subject,
      body,
      from_name: resumeData.fullName,
      from_email: resumeData.email
    }

    setGeneratedEmail(emailData)
    toast.dismiss('generating')
    
    try {
      await sendEmail(emailData)
    } catch (error) {
      console.error('Email sending error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const sendEmail = async (data) => {
    const templateParams = {
      to_email: data.to,
      subject: data.subject,
      message: data.body,
      from_name: data.from_name,
      from_email: data.from_email
    }

    try {
      await toast.promise(
        emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, USER_ID),
        {
          loading: 'Sending email...',
          success: (response) => {
            return 'Email sent successfully! 🎉'
          },
          error: (error) => {
            return 'Failed to send email. Please try again.'
          }
        },
        {
          success: {
            style: {
              background: '#F0FDF4',
              color: '#16A34A',
              borderLeft: '4px solid #16A34A'
            },
            icon: <CheckCircle className="text-green-600" />
          },
          error: {
            style: {
              background: '#FEE2E2',
              color: '#DC2626',
              borderLeft: '4px solid #DC2626'
            },
            icon: <AlertCircle className="text-red-600" />
          },
          loading: {
            style: {
              background: '#FFF7ED',
              color: '#FF6B35',
              borderLeft: '4px solid #FF6B35'
            }
          }
        }
      )
    } catch (error) {
      throw error
    }
  }

  const copyToClipboard = () => {
    if (!generatedEmail) return

    const fullEmail = `To: ${generatedEmail.to}\nSubject: ${generatedEmail.subject}\n\n${generatedEmail.body}`
    navigator.clipboard.writeText(fullEmail).then(() => {
      toast.success('Email copied to clipboard!', {
        style: {
          background: '#F0FDF4',
          color: '#16A34A',
          borderLeft: '4px solid #16A34A'
        },
        icon: <CheckCircle className="text-green-600" />
      })
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <Toaster 
        position="top-right" 
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full mb-6 shadow-lg">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent mb-4">
            Email Template Generator
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload your resume and let AI craft the perfect job application email for you
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Resume Upload Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Upload Resume</h2>
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleResumeUpload}
                className="hidden"
                id="resume-upload"
                disabled={isProcessing}
              />
              <label
                htmlFor="resume-upload"
                className={`
                  flex flex-col items-center justify-center w-full h-32 border-2 border-dashed 
                  rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02]
                  ${isProcessing 
                    ? 'border-orange-200 bg-orange-50 cursor-not-allowed' 
                    : 'border-orange-300 bg-orange-50 hover:bg-orange-100 hover:border-orange-400'
                  }
                `}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
                    <p className="text-orange-600 font-medium">Processing your resume...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-orange-500 mb-2" />
                    <p className="text-orange-600 font-medium">
                      {resumeFile ? resumeFile.name : 'Click to upload PDF or DOCX'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Maximum file size: 10MB</p>
                  </div>
                )}
              </label>
            </div>

            {/* Extracted Data Preview */}
            {extractedData && (
              <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Extracted Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><strong>Name:</strong> {extractedData.fullName}</div>
                  <div><strong>Email:</strong> {extractedData.email}</div>
                  <div><strong>Role:</strong> {extractedData.currentRole}</div>
                  <div><strong>Skills:</strong> {extractedData.skills.join(', ') || 'None detected'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Job Description */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Job Description</h2>
              </div>
              <textarea
                placeholder="Paste the complete job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full h-40 p-4 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none transition-all"
              />
            </div>

            {/* HR Email */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                  <Mail className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">HR Contact</h2>
              </div>
              <input
                type="email"
                placeholder="Enter HR email address"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                className="w-full p-4 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
              <p className="text-sm text-gray-500 mt-3">
                The email will be sent directly to this address
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={generateEmail}
              disabled={isGenerating || isProcessing}
              className={`
                inline-flex items-center px-8 py-4 text-lg font-bold text-white rounded-xl
                transition-all duration-300 transform hover:scale-105 shadow-lg
                ${isGenerating || isProcessing
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow-xl'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Generating Email...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-3" />
                  Generate & Send Email
                </>
              )}
            </button>
          </div>

          {/* Generated Email Preview */}
          {generatedEmail && (
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Generated Email</h2>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Copy Email
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div><strong className="text-gray-700">To:</strong> <span className="text-orange-600">{generatedEmail.to}</span></div>
                  <div><strong className="text-gray-700">Subject:</strong> <span className="text-gray-600">{generatedEmail.subject}</span></div>
                </div>
                <hr className="border-gray-200" />
                <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm leading-relaxed">
                  {generatedEmail.body}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App