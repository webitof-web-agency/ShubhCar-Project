// backend/services/emailNotification.service.js
const EmailTemplate = require('../models/EmailTemplate.model');
const { sendEmail } = require('../utils/email');
const { error } = require('../utils/apiResponse');

class EmailNotificationService {
  async send({ templateName, to, variables = {} }) {
    const template = await EmailTemplate.findOne({ name: templateName }).lean();
    if (!template) error(`Email template ${templateName} not found`, 404);

    let html = template.bodyHtml;
    let subject = template.subject;

    Object.entries(variables).forEach(([key, value]) => {
      html = html.replaceAll(`{{${key}}}`, value ?? '');
      subject = subject.replaceAll(`{{${key}}}`, value ?? '');
    });

    await sendEmail({ to, subject, html });
    return true;
  }
}

module.exports = new EmailNotificationService();
