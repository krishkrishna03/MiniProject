# Email Template Generator

A React-based application that automatically generates personalized email templates for job applications by parsing resumes and job descriptions.

## 🚀 Features

- **Resume Parsing**: Upload PDF or DOCX resumes and automatically extract candidate information
- **Smart Job Role Extraction**: Intelligently extracts job titles from job descriptions
- **Multiple Email Templates**: Generate 6 different professional email templates
- **Template Preview**: Preview emails before sending
- **Direct Email Sending**: Send emails directly using EmailJS integration
- **Real-time Feedback**: Loading states and toast notifications
- **Responsive Design**: Beautiful UI that works on all devices

## 📋 Prerequisites

Before running this application, you need to set up EmailJS:

1. Create an account at [EmailJS.com](https://www.emailjs.com/)
2. Create an email service (Gmail, Outlook, etc.)
3. Create an email template
4. Get your credentials (User ID, Service ID, Template ID)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd email-template-generator
```

2. Install dependencies:
```bash
npm install
```

3. Configure EmailJS:
   - Open `src/App.jsx`
   - Replace the following placeholders with your EmailJS credentials:
     - `YOUR_EMAILJS_USER_ID` - Your EmailJS User ID
     - `YOUR_SERVICE_ID` - Your EmailJS Service ID
     - `YOUR_TEMPLATE_ID` - Your EmailJS Template ID

4. Start the development server:
```bash
npm run dev
```

## 📧 EmailJS Setup Guide

### Step 1: Create EmailJS Account
1. Go to [EmailJS.com](https://www.emailjs.com/) and sign up
2. Verify your email address

### Step 2: Add Email Service
1. Go to "Email Services" in your dashboard
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions
5. Note down your **Service ID**

### Step 3: Create Email Template
1. Go to "Email Templates" in your dashboard
2. Click "Create New Template"
3. Use this template structure:
```
Subject: {{subject}}
From: {{from_name}} <{{from_email}}>
To: {{to_email}}

{{message}}
```
4. Save and note down your **Template ID**

### Step 4: Get User ID
1. Go to "Account" in your dashboard
2. Find your **User ID** (also called Public Key)

### Step 5: Update Code
Replace the placeholders in `src/App.jsx`:
```javascript
// Replace these with your actual EmailJS credentials
emailjs.init("your_actual_user_id");

await emailjs.send(
  'your_actual_service_id',
  'your_actual_template_id',
  templateParams
);
```

## 🎯 How to Use

### Step 1: Upload Resume
- Click "Upload Resume" and select a PDF or DOCX file
- The app will automatically extract your name, email, and experience

### Step 2: Enter Job Details
- **Job Description**: Enter the complete job description or just the job title
- **HR Email**: Enter the recruiter's email address

### Step 3: Generate Templates
- Click "Generate Templates" to create 6 different email templates
- Each template has a different tone and style

### Step 4: Select and Send
- Preview any template by clicking on it
- Click "Send" to send the email directly to the HR

## 📝 Template Types

1. **Professional & Direct**: Formal and straightforward approach
2. **Enthusiastic & Personal**: Shows excitement and personality
3. **Skills-Focused**: Highlights qualifications and abilities
4. **Company-Focused**: Emphasizes interest in the company
5. **Achievement-Oriented**: Focuses on results and accomplishments
6. **Future-Oriented**: Discusses growth and future contributions

## 🔧 Technical Details

### Dependencies
- **React**: Frontend framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling framework
- **EmailJS**: Client-side email sending
- **Mammoth**: DOCX file parsing
- **PDF.js**: PDF file parsing
- **React Hot Toast**: Notification system
- **Lucide React**: Icon library

### File Structure
```
src/
├── App.jsx          # Main application component
├── main.jsx         # React entry point
├── index.css        # Global styles
└── vite-env.d.ts    # Vite type definitions
```

## 🐛 Troubleshooting

### Common Issues

1. **Resume attachment not working**:
   - Ensure your EmailJS template supports attachments
   - Check file size limits (EmailJS has a 2MB limit for attachments)
   - Verify the attachment parameter is configured in your EmailJS template

1. **Email not sending**:
   - Check EmailJS credentials are correct
   - Verify email service is properly configured
   - Check browser console for errors

2. **Resume parsing fails**:
   - Ensure file is PDF or DOCX format
   - Check file is not corrupted
   - Try with a different resume format

3. **Name extraction incomplete**:
   - The app uses pattern matching to extract names
   - Ensure your name appears clearly at the top of your resume
   - Consider manually editing extracted information if needed

4. **Job role extraction issues**:
   - For best results, start your job description with the job title
   - Example: "Software Engineer at Google" or "Data Scientist - Remote"
   - The app will intelligently extract the role from longer descriptions

5. **Resume parsing shows raw text**:
   - The app now uses smart heuristics to clean and summarize resume content
   - It extracts years of experience, skills, and job titles automatically
   - If parsing seems incomplete, ensure your resume has clear section headers (EXPERIENCE, SKILLS, etc.)

### Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify your EmailJS setup
3. Check browser console for error messages
4. Create an issue in the repository

## 🔮 Future Enhancements

- AI-powered job description analysis
- More email template styles
- Resume format validation
- Email tracking and analytics
- Integration with job boards
- Multi-language support

---

**Note**: This application runs entirely in the browser and doesn't require a backend server. All email sending is handled through EmailJS service.
