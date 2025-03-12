type EmailTemplateProps = {
  recipientName?: string;
  invitedBy?: string;
  acceptLink?: string;
  rejectLink?: string;
  email?: string;
  token?: string;
  userName?: string;
  verificationLink?: string;
  taskName?: string;
  taskDescription?: string;
  projectName?: string;
  dueDate?: string;
  priority?: string;
  taskLink?: string;
  updates?:{title: string, description: string, date: string}[];
  tasksDue?:{name: string, dueDate: string}[];
  projects?:{name: string, progress: number}[];
  deactivationDate?: string;
  reactivationLink?: string;
};

/**
 * SyncFlow Project Invitation Email Template
 */
export const getSyncFlowEmailHtml = ({
  recipientName,
  invitedBy,
  acceptLink,
  rejectLink,
}: EmailTemplateProps): string => {
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SyncFlow Project Invitation</title>
        <style>
          /* Include the same styles as before */
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <span style="font-size: 32px; font-weight: 700;">SyncFlow</span>
            </div>
            <h1>Project Collaboration Platform</h1>
            <div class="tagline">Streamline your workflow. Amplify your productivity.</div>
          </div>
          <div class="content">
            <div class="about">
              <h3>About SyncFlow</h3>
              <p>SyncFlow is a powerful project management platform designed to help teams collaborate seamlessly. With real-time updates, intuitive task management, and integrated communication tools, SyncFlow transforms how teams work together to achieve their goals.</p>
            </div>
            
            <h2>You're Invited to Collaborate!</h2>
            <p>Hello <span class="highlight">${recipientName || 'there'}</span>,</p>
            <p><span class="highlight">${invitedBy}</span> has invited you to join their project on SyncFlow.</p>
            <p>By accepting this invitation, you'll gain access to project resources, tasks, and team communication channels.</p>
            
            <div class="button-container">
              <a href="${acceptLink}" class="button">Accept Invitation</a>
              <a href="${rejectLink}" class="button reject">Decline</a>
            </div>
            
            <div class="divider"></div>
            
            <p>If you have any questions about this invitation, please contact the project owner directly.</p>
          </div>
          <div class="footer">
            <p>© 2025 SyncFlow. All rights reserved.</p>
            <div class="social-links">
              <a href="#">Twitter</a> | 
              <a href="#">LinkedIn</a> | 
              <a href="#">Instagram</a>
            </div>
            <p class="footer-note">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

/**
 * SyncFlow Password Reset Email Template
 */
export const getSyncFlowResetPasswordEmailHtml = ({
  email,
  token,
}: EmailTemplateProps): string => {
  const encodedToken = encodeURIComponent(token || '');
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${encodedToken}?email=${email}`;

  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SyncFlow Password Reset</title>
        <style>
          /* Include the same styles as before */
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <span style="font-size: 32px; font-weight: 700;">SyncFlow</span>
            </div>
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset the password for your SyncFlow account associated with <span class="highlight">${email}</span>.</p>
            
            <a href="${resetLink}" class="button">Reset Password</a>
            
            <p class="expiry">This password reset link will expire in 24 hours.</p>
            
            <div class="security-note">
              <h4>Security Notice</h4>
              <p>If you didn't request a password reset, please ignore this email or contact our support team immediately if you believe your account may be compromised.</p>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 SyncFlow. All rights reserved.</p>
            <div class="social-links">
              <a href="#">Twitter</a> | 
              <a href="#">LinkedIn</a> | 
              <a href="#">Instagram</a>
            </div>
            <p class="footer-note">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

/**
 * Welcome Email Template
 */
export const getWelcomeEmailHtml = ({
  userName,
  verificationLink,
}: EmailTemplateProps): string => {
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SyncFlow</title>
        <style>
          /* Include the same styles as before */
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <span style="font-size: 32px; font-weight: 700;">SyncFlow</span>
            </div>
            <h1>Welcome Aboard!</h1>
            <div class="tagline">Streamline your workflow. Amplify your productivity.</div>
          </div>
          <div class="content">
            <div class="welcome-message">
              <h2>Hello, ${userName || 'there'}!</h2>
              <p>We're thrilled to have you join SyncFlow. Your journey to better project management and team collaboration starts now.</p>
            </div>
            
            <div class="verify-note">
              <h4>Verify Your Email</h4>
              <p>To ensure the security of your account and get the most out of SyncFlow, please verify your email address by clicking the button below:</p>
            </div>
            
            <div class="text-center">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>
            
            <div class="steps">
              <h3>Get Started in 3 Simple Steps</h3>
              <!-- Steps content here -->
            </div>
            
            <h3 style="text-align: center; color: #2d3748; margin-bottom: 20px;">Key Features You'll Love</h3>
            <!-- Features content here -->
          </div>
          <div class="footer">
            <p>© 2025 SyncFlow. All rights reserved.</p>
            <div class="social-links">
              <a href="#">Twitter</a> | 
              <a href="#">LinkedIn</a> | 
              <a href="#">Instagram</a>
            </div>
            <p class="footer-note">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

/**
 * Task Assignment Email Template
 */
export const getTaskAssignmentEmailHtml = ({
  userName,
  taskName,
  taskDescription,
  projectName,
  dueDate,
  priority,
  taskLink,
}: EmailTemplateProps): string => {
  const getPriorityBadge = (priority: string = 'normal') => {
    const priorities: {
      [key in 'high' | 'medium' | 'low' | 'normal']: {
        color: string;
        background: string;
        text: string;
      };
    } = {
      high: { color: '#e53e3e', background: '#fed7d7', text: 'High' },
      medium: { color: '#dd6b20', background: '#feebc8', text: 'Medium' },
      low: { color: '#38a169', background: '#c6f6d5', text: 'Low' },
      normal: { color: '#718096', background: '#e2e8f0', text: 'Normal' },
    };

    const style =
      priorities[
        priority.toLowerCase() as 'high' | 'medium' | 'low' | 'normal'
      ] || priorities.normal;
    return `<span style="display: inline-block; padding: 4px 8px; background-color: ${style.background}; color: ${style.color}; border-radius: 4px; font-size: 12px; font-weight: 500;">${style.text}</span>`;
  };

  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Task Assignment - SyncFlow</title>
        <style>
          /* Include the same styles as before */
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <span style="font-size: 32px; font-weight: 700;">SyncFlow</span>
            </div>
            <h1>New Task Assignment</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>You have been assigned a new task in the project <strong>${projectName}</strong>.</p>
            
            <div class="task-card">
              <div class="task-header">
                <h2 class="task-title">${taskName}</h2>
                ${getPriorityBadge(priority)}
              </div>
              <div class="task-description">
                ${taskDescription || 'No description provided.'}
              </div>
              <div class="task-meta">
                <div class="task-meta-item">
                  <span class="task-meta-label">Project</span>
                  <span class="task-meta-value">${projectName}</span>
                </div>
                <div class="task-meta-item">
                  <span class="task-meta-label">Due Date</span>
                  <span class="task-meta-value">${dueDate || 'No due date'}</span>
                </div>
              </div>
              <div class="text-center">
                <a href="${taskLink}" class="button">View Task</a>
              </div>
            </div>
            
            <div class="tips">
              <h3>Quick Tips for Task Management</h3>
              <ul>
                <li>Break down large tasks into smaller, manageable subtasks</li>
                <li>Set reminders for important deadlines</li>
                <li>Communicate with your team about task progress</li>
                <li>Use comments to provide updates or ask questions</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 SyncFlow. All rights reserved.</p>
            <div class="social-links">
              <a href="#">Twitter</a> | 
              <a href="#">LinkedIn</a> | 
              <a href="#">Instagram</a>
            </div>
            <p class="footer-note">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

/**
 * Weekly Digest Email Template
 */
export const getWeeklyDigestEmailHtml = ({
  userName,
  updates,
  tasksDue,
  projects,
}: EmailTemplateProps): string => {
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Digest - SyncFlow</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          
          body {
            font-family: 'Poppins', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          }
          .header {
            background: linear-gradient(135deg, #4158D0, #C850C0);
            color: #ffffff;
            padding: 25px 20px;
            text-align: center;
          }
          .logo {
            margin-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            font-weight: 600;
            font-size: 28px;
            letter-spacing: 0.5px;
          }
          .content {
            padding: 30px;
          }
          .content h2 {
            margin: 0 0 20px;
            font-size: 24px;
            color: #2d3748;
            font-weight: 600;
          }
          .content p {
            margin: 10px 0;
            color: #4a5568;
          }
          .highlight {
            font-weight: 600;
            color: #3a86ff;
          }
          .updates, .tasks-due, .projects {
            margin-bottom: 25px;
          }
          .update-item, .task-item, .project-item {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
          }
          .update-item h4, .task-item h4, .project-item h4 {
            margin: 0 0 10px;
            color: #2d3748;
            font-size: 16px;
          }
          .update-item p, .task-item p, .project-item p {
            margin: 0;
            color: #4a5568;
            font-size: 14px;
          }
          .footer {
            background-color: #f8fafc;
            text-align: center;
            padding: 20px;
            color: #718096;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
          }
          .footer-note {
            font-style: italic;
            margin-top: 15px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <span style="font-size: 32px; font-weight: 700;">SyncFlow</span>
            </div>
            <h1>Weekly Digest</h1>
          </div>
          <div class="content">
            <h2>Hello, ${userName || 'there'}!</h2>
            <p>Here's a summary of your activities and updates for this week:</p>
            
            <div class="updates">
              <h3>Recent Updates</h3>
              ${updates
                ?.map(
                  (update) => `
                <div class="update-item">
                  <h4>${update.title}</h4>
                  <p>${update.description}</p>
                  <small>Updated on: ${update.date}</small>
                </div>
              `,
                )
                .join('')}
            </div>
            
            <div class="tasks-due">
              <h3>Upcoming Tasks</h3>
              ${tasksDue
                ?.map(
                  (task) => `
                <div class="task-item">
                  <h4>${task.name}</h4>
                  <p>Due on: ${task.dueDate}</p>
                </div>
              `,
                )
                .join('')}
            </div>
            
            <div class="projects">
              <h3>Active Projects</h3>
              ${projects
                ?.map(
                  (project) => `
                <div class="project-item">
                  <h4>${project.name}</h4>
                  <p>Progress: ${project.progress}%</p>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
          <div class="footer">
            <p>© 2025 SyncFlow. All rights reserved.</p>
            <p class="footer-note">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

/**
 * Account Deactivation Email Template
 */
export const getAccountDeactivationEmailHtml = ({
    userName,
    deactivationDate,
    reactivationLink,
  }: EmailTemplateProps): string => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deactivation Notice - SyncFlow</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          
          body {
            font-family: 'Poppins', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          }
          .header {
            background: linear-gradient(135deg, #4158D0, #C850C0);
            color: #ffffff;
            padding: 25px 20px;
            text-align: center;
          }
          .logo {
            margin-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            font-weight: 600;
            font-size: 28px;
            letter-spacing: 0.5px;
          }
          .content {
            padding: 30px;
          }
          .content h2 {
            margin: 0 0 20px;
            font-size: 24px;
            color: #2d3748;
            font-weight: 600;
          }
          .content p {
            margin: 10px 0;
            color: #4a5568;
          }
          .highlight {
            font-weight: 600;
            color: #3a86ff;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            margin: 25px 0;
            background-color: #3a86ff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 500;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 6px rgba(58, 134, 255, 0.2);
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(58, 134, 255, 0.3);
          }
          .security-note {
            background-color: #fff8f1;
            border-left: 4px solid #ed8936;
            padding: 12px 15px;
            margin: 25px 0;
            text-align: left;
            border-radius: 0 4px 4px 0;
          }
          .security-note h4 {
            color: #c05621;
            margin: 0 0 5px;
            font-size: 16px;
          }
          .security-note p {
            margin: 0;
            color: #744210;
            font-size: 14px;
          }
          .footer {
            background-color: #f8fafc;
            text-align: center;
            padding: 20px;
            color: #718096;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
          }
          .footer-note {
            font-style: italic;
            margin-top: 15px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <span style="font-size: 32px; font-weight: 700;">SyncFlow</span>
            </div>
            <h1>Account Deactivation Notice</h1>
          </div>
          <div class="content">
            <h2>Hello, ${userName || 'there'}!</h2>
            <p>We regret to inform you that your SyncFlow account has been deactivated as of <strong>${deactivationDate}</strong>.</p>
            <p>If this was a mistake or you wish to reactivate your account, please click the button below:</p>
            
            <div class="text-center">
              <a href="${reactivationLink}" class="button">Reactivate Account</a>
            </div>
            
            <div class="security-note">
              <h4>Security Notice</h4>
              <p>If you did not request this deactivation, please contact our support team immediately to secure your account.</p>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 SyncFlow. All rights reserved.</p>
            <p class="footer-note">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };