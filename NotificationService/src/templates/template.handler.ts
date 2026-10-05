import fs from "fs/promises";
import path from "path";
import Handlebars from "handlebars";

export async function renderMailTemplate(
  templateId: string,
  params: Record<string, unknown>
) {
  if (!['booking-confirmed', 'booking-cancelled'].includes(templateId)) throw new Error('Unknown email template');
  const templatePath = path.join(
    process.cwd(),
    "src",
    "templates",
    "mailer",
    `${templateId}.hbs`
  );

  const templateContent = await fs.readFile(templatePath, "utf-8");
  const compiledTemplate = Handlebars.compile(templateContent);

  return compiledTemplate(params);
}
