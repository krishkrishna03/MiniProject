import { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import emailjs from 'emailjs-com'
import { Upload, Send, Loader2, Check } from 'lucide-react'
import mammoth from 'mammoth'

const EmailTemplateGenerator = () => {
  const [resume, setResume] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [hrEmail, setHrEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedInfo, setExtractedInfo] = useState({})
  const [emailTemplates, setEmailTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    setResume(file)

    if (file && file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setLoading(true)
      try {
        const arrayBuffer = await file.arrayBuffer()
        const { value } = await mammoth.extractRawText({ arrayBuffer })
        const nameMatch = value.match(/Name[:\-]?\s*(.*)/i)
        const emailMatch = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/)

        setExtractedInfo({
          name: nameMatch ? nameMatch[1].trim() : 'Your Name',
          email: emailMatch ? emailMatch[0] : 'your@email.com'
        })

        toast.success('Resume uploaded & info extracted!')
      } catch (error) {
        toast.error('Error extracting resume info')
      }
      setLoading(false)
    } else {
      toast.error('Please upload a DOCX file')
    }
  }

  const generateTemplates = () => {
    const { name, email } = extractedInfo
    const templates = [
      `Dear Hiring Manager,\n\nI'm writing to express my interest in the ${jobDescription} role. With my background and experience, I believe I’d be a valuable addition to your team.\n\nRegards,\n${name}\n${email}`,
      `Hi,\n\nHope you’re doing well. I’d like to apply for the ${jobDescription} role. My skills and experience make me a strong fit. I’d be happy to provide more information.\n\nThank you,\n${name}\n${email}`,
      `Respected Sir/Madam,\n\nI'm thrilled to submit my application for the ${jobDescription} opportunity. Please find my resume attached for your review.\n\nBest,\n${name}\n${email}`,
      `To whom it may concern,\n\nI’m applying for the ${jobDescription} position. I have hands-on experience and I’m passionate about contributing to your team.\n\nWarm regards,\n${name}\n${email}`,
      `Hello,\n\nI'm very interested in the ${jobDescription} position. Based on my profile, I believe I’d be a great match.\n\nLooking forward,\n${name}\n${email}`
    ]
    setEmailTemplates(templates)
    toast.success('Templates generated!')
  }

  const sendEmail = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template to send!')
      return
    }

    const emailData = {
      from_name: extractedInfo.name,
      from_email: extractedInfo.email,
      to_email: hrEmail,
      message: selectedTemplate.slice(0, 49000) // Trimming to stay below 50KB
    }

    setLoading(true)
    emailjs.send('your_service_id', 'your_template_id', emailData, 'your_public_key')
      .then(() => {
        toast.success('Email sent successfully!')
      })
      .catch((error) => {
        console.error(error)
        toast.error(`Failed to send email: ${error.text || error.message}`)
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="p-4 max-w-2xl mx-auto text-white">
      <Toaster />
      <h1 className="text-3xl font-bold mb-4 text-orange-400">Email Template Generator</h1>

      <label className="block mb-2">Upload Resume</label>
      <input type="file" accept=".docx" onChange={handleFileUpload} className="mb-4" />
      {loading && <Loader2 className="animate-spin" />}
      {resume && (
        <div className="mb-4 text-sm">
          Extracted Name: <span className="text-green-400">{extractedInfo.name}</span><br />
          Extracted Email: <span className="text-green-400">{extractedInfo.email}</span>
        </div>
      )}

      <label className="block mb-2">Job Description</label>
      <textarea
        className="w-full p-2 mb-4 text-black"
        rows="4"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      <label className="block mb-2">HR Email</label>
      <input
        type="email"
        className="w-full p-2 mb-4 text-black"
        value={hrEmail}
        onChange={(e) => setHrEmail(e.target.value)}
      />

      <button
        className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded mr-4"
        onClick={generateTemplates}
      >
        Generate Templates
      </button>

      {emailTemplates.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Choose a Template:</h2>
          {emailTemplates.map((template, index) => (
            <div
              key={index}
              onClick={() => setSelectedTemplate(template)}
              className={`p-4 mb-2 border rounded cursor-pointer hover:bg-orange-100 text-black ${selectedTemplate === template ? 'bg-orange-300' : 'bg-white'}`}
            >
              {template}
            </div>
          ))}

          <button
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mt-4 text-white"
            onClick={sendEmail}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Send className="inline mr-2" />Send Email</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default EmailTemplateGenerator
