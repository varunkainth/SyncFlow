import transporter from '../config/nodemailer.config.ts';
import {
  getSyncFlowEmailHtml,
  getSyncFlowResetPasswordEmailHtml,
  getWelcomeEmailHtml,
  getTaskAssignmentEmailHtml,
  getWeeklyDigestEmailHtml,
  getAccountDeactivationEmailHtml,
} from './emails.utils.ts';

/**
 * Send Welcome Email
 */
export const sendWelcomeMail = async (
  email: string,
  userName: string,
  verificationLink: string,
) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to SyncFlow',
      html: getWelcomeEmailHtml({ userName, verificationLink }),
    });
  } catch (error) {
    console.error('[SendMailError]', error);
  }
};

/**
 * Send Password Reset Email
 */
export const sendPasswordResetMail = async (email: string, token: string) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: getSyncFlowResetPasswordEmailHtml({ email, token }),
    });
  } catch (error) {
    console.error('[SendMailError]', error);
  }
};

/**
 * Send Project Invitation Email
 */
export const sendProjectInvitationMail = async (
  recipientEmail: string,
  recipientName: string,
  invitedBy: string,
  acceptLink: string,
  rejectLink: string,
) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'You’ve Been Invited to a Project on SyncFlow',
      html: getSyncFlowEmailHtml({ recipientName, invitedBy, acceptLink, rejectLink }),
    });
  } catch (error) {
    console.error('[SendMailError]', error);
  }
};

/**
 * Send Task Assignment Email
 */
export const sendTaskAssignmentMail = async (
  email: string,
  userName: string,
  taskName: string,
  taskDescription: string,
  projectName: string,
  dueDate: string,
  priority: string,
  taskLink: string,
) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `New Task Assigned: ${taskName}`,
      html: getTaskAssignmentEmailHtml({
        userName,
        taskName,
        taskDescription,
        projectName,
        dueDate,
        priority,
        taskLink,
      }),
    });
  } catch (error) {
    console.error('[SendMailError]', error);
  }
};

/**
 * Send Weekly Digest Email
 */
export const sendWeeklyDigestMail = async (
  email: string,
  userName: string,
  updates: Array<{ title: string; description: string; date: string }>,
  tasksDue: Array<{ name: string; dueDate: string }>,
  projects: Array<{ name: string; progress: number }>,
) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Weekly SyncFlow Digest',
      html: getWeeklyDigestEmailHtml({ userName, updates, tasksDue, projects }),
    });
  } catch (error) {
    console.error('[SendMailError]', error);
  }
};

/**
 * Send Account Deactivation Email
 */
export const sendAccountDeactivationMail = async (
  email: string,
  userName: string,
  deactivationDate: string,
  reactivationLink: string,
) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Account Deactivation Notice',
      html: getAccountDeactivationEmailHtml({ userName, deactivationDate, reactivationLink }),
    });
  } catch (error) {
    console.error('[SendMailError]', error);
  }
};