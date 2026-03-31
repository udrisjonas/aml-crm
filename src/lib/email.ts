import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: parseInt(process.env.SMTP_PORT ?? "587") === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface KycEmailOptions {
  to: string;
  clientName: string;
  kycUrl: string;
  language: "lt" | "en";
  companyName: string;
}

function buildLtHtml(opts: KycEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="lt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:#1e40af;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${opts.companyName}</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Pinigų plovimo prevencijos tarnyba</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Gerbiamas(-a) <strong>${opts.clientName}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              Pagal Lietuvos Respublikos Pinigų plovimo ir teroristų finansavimo prevencijos įstatymą
              esame įpareigoti nuolat atnaujinti klientų tapatybės nustatymo ir tikrinimo informaciją.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              Prašome užpildyti KYC (Know Your Customer) anketą paspaudę žemiau esantį mygtuką.
              Anketa užtruks apie 5–10 minučių.
            </p>
            <p style="margin:0 0 8px;font-size:14px;color:#dc2626;font-weight:600;">
              ⏱ Nuoroda galioja 48 valandas.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:#1e40af;border-radius:8px;">
                  <a href="${opts.kycUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Pildyti KYC anketą →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
              Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:
            </p>
            <p style="margin:0 0 24px;font-size:12px;color:#3b82f6;word-break:break-all;">${opts.kycUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
              Šis laiškas išsiųstas automatiškai. Neatsakykite į jį.<br>
              Jei turite klausimų, susisiekite su savo makleriu.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} ${opts.companyName}. Visi teisės saugomos.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildEnHtml(opts: KycEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:#1e40af;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${opts.companyName}</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Anti-Money Laundering Compliance</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Dear <strong>${opts.clientName}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              As part of our obligations under anti-money laundering regulations, we are required to
              periodically verify and update client identification information.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              Please complete our KYC (Know Your Customer) questionnaire by clicking the button below.
              It should take approximately 5–10 minutes.
            </p>
            <p style="margin:0 0 8px;font-size:14px;color:#dc2626;font-weight:600;">
              ⏱ This link is valid for 48 hours.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:#1e40af;border-radius:8px;">
                  <a href="${opts.kycUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Complete KYC questionnaire →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
              If the button above does not work, copy this link into your browser:
            </p>
            <p style="margin:0 0 24px;font-size:12px;color:#3b82f6;word-break:break-all;">${opts.kycUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
              This email was sent automatically. Please do not reply.<br>
              If you have questions, please contact your broker directly.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} ${opts.companyName}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface EddEmailOptions {
  to: string;
  clientName: string;
  eddUrl: string;
  language: "lt" | "en";
  companyName: string;
}

function buildLtEddHtml(opts: EddEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="lt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:#991b1b;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${opts.companyName}</h1>
            <p style="margin:6px 0 0;color:#fecaca;font-size:14px;">Sustiprintas deramas patikrinimas (EDD)</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Gerbiamas(-a) <strong>${opts.clientName}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              Remiantis Lietuvos Respublikos Pinigų plovimo ir teroristų finansavimo prevencijos įstatymu,
              dėl jūsų, kaip politiškai paveikto asmens (PEP), statuso esame įpareigoti atlikti
              <strong>sustiprintą deramą patikrinimą (EDD)</strong>.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              Prašome užpildyti EDD anketą paspaudę žemiau esantį mygtuką. Tai yra privaloma procedūra.
              Jei anketa nebus užpildyta, tolimesnis bendradarbiavimas gali būti sustabdytas.
            </p>
            <p style="margin:0 0 8px;font-size:14px;color:#dc2626;font-weight:600;">
              ⏱ Nuoroda galioja 72 valandas.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:#991b1b;border-radius:8px;">
                  <a href="${opts.eddUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Pildyti EDD anketą →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
              Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:
            </p>
            <p style="margin:0 0 24px;font-size:12px;color:#3b82f6;word-break:break-all;">${opts.eddUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
              Šis laiškas išsiųstas automatiškai. Neatsakykite į jį.<br>
              Jei turite klausimų, susisiekite su savo makleriu.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} ${opts.companyName}. Visi teisės saugomos.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildEnEddHtml(opts: EddEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:#991b1b;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${opts.companyName}</h1>
            <p style="margin:6px 0 0;color:#fecaca;font-size:14px;">Enhanced Due Diligence (EDD)</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Dear <strong>${opts.clientName}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              Due to your status as a Politically Exposed Person (PEP), we are required under
              anti-money laundering regulations to conduct <strong>Enhanced Due Diligence (EDD)</strong>
              before we can proceed with our business relationship.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              Please complete the EDD questionnaire by clicking the button below. This is a mandatory
              requirement. Failure to complete this questionnaire may result in the suspension of
              our business relationship.
            </p>
            <p style="margin:0 0 8px;font-size:14px;color:#dc2626;font-weight:600;">
              ⏱ This link is valid for 72 hours.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:#991b1b;border-radius:8px;">
                  <a href="${opts.eddUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Complete EDD questionnaire →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
              If the button above does not work, copy this link into your browser:
            </p>
            <p style="margin:0 0 24px;font-size:12px;color:#3b82f6;word-break:break-all;">${opts.eddUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
              This email was sent automatically. Please do not reply.<br>
              If you have questions, please contact your broker directly.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} ${opts.companyName}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Invite email ──────────────────────────────────────────────────────────────

export interface InviteEmailOptions {
  to: string;
  inviteeName: string;
  inviteUrl: string;
  companyName: string;
}

export async function sendInviteEmail(opts: InviteEmailOptions): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    throw new Error("SMTP not configured");
  }
  const transporter = createTransport();
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:#0f172a;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${opts.companyName}</h1>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">AML Compliance Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hello <strong>${opts.inviteeName}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              You have been invited to join <strong>${opts.companyName}</strong>'s AML compliance platform.
              Click the button below to set your password and activate your account.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:#0f172a;border-radius:8px;">
                  <a href="${opts.inviteUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Accept invitation →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
              If the button above does not work, copy this link into your browser:
            </p>
            <p style="margin:0 0 24px;font-size:12px;color:#3b82f6;word-break:break-all;">${opts.inviteUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
              This email was sent automatically. Please do not reply.<br>
              If you were not expecting this invitation, you can ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} ${opts.companyName}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: opts.to,
    subject: `You've been invited to ${opts.companyName}`,
    html,
  });
}

export async function sendEddEmail(opts: EddEmailOptions): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    throw new Error("SMTP not configured");
  }
  const transporter = createTransport();
  const isLT = opts.language === "lt";

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: opts.to,
    subject: isLT
      ? "Prašymas užpildyti EDD anketą (sustiprintas patikrinimas)"
      : "Enhanced Due Diligence (EDD) questionnaire — action required",
    html: isLT ? buildLtEddHtml(opts) : buildEnEddHtml(opts),
  });
}

export async function sendKycEmail(opts: KycEmailOptions): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    throw new Error("SMTP not configured");
  }
  const transporter = createTransport();
  const isLT = opts.language === "lt";

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: opts.to,
    subject: isLT
      ? "Prašymas užpildyti KYC anketą"
      : "KYC questionnaire completion request",
    html: isLT ? buildLtHtml(opts) : buildEnHtml(opts),
  });
}
