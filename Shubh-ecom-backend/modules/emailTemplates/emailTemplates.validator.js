const Joi = require('joi');

const listEmailTemplatesQuerySchema = Joi.object({
  name: Joi.string().trim().max(120),
  subject: Joi.string().trim().max(200),
});

const templatePayload = {
  name: Joi.string().trim().min(2).max(120),
  subject: Joi.string().trim().min(2).max(200),
  bodyHtml: Joi.string().min(1),
  html: Joi.string().min(1),
  variables: Joi.object().default({}),
};

const createEmailTemplateSchema = Joi.object({
  ...templatePayload,
  name: templatePayload.name.required(),
  subject: templatePayload.subject.required(),
}).or('bodyHtml', 'html');

const updateEmailTemplateSchema = Joi.object(templatePayload)
  .or('bodyHtml', 'html')
  .min(1);

module.exports = {
  listEmailTemplatesQuerySchema,
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
};
