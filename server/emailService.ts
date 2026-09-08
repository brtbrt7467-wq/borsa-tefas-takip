import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface EmailAlertData {
  code: string;
  name: string;
  type: string;
  condition: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  initialPrice?: number;
  triggeredAt: string;
  note?: string;
}

let transporter: nodemailer.Transporter | null = null;

export function getEmailTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
    console.log(`[EmailService] Configured SMTP transporter for ${host}:${port} (${user})`);
  } else {
    // If no custom SMTP credentials, create a fallback transporter or ethereal test account
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'system.alerts@borsa-tefas.local',
        pass: 'simulated_password'
      },
      // Do not fail if ethereal credentials aren't live; fallback will log
      tls: { rejectUnauthorized: false }
    });
    console.log('[EmailService] SMTP credentials not fully set; using safe fallback delivery mode.');
  }

  return transporter;
}

/**
 * Generates an elegant HTML email template for triggered price alerts
 */
export function generateAlertHtml(data: EmailAlertData, recipientEmail: string): string {
  const isAbove = data.condition === 'above';
  const directionText = isAbove ? 'Hedef Fiyatın Üzerine Çıktı (▲)' : 'Hedef Fiyatın Altına İndi (▼)';
  const directionColor = isAbove ? '#10b981' : '#f43f5e';
  const badgeBg = isAbove ? '#ecfdf5' : '#fff1f2';
  const badgeBorder = isAbove ? '#a7f3d0' : '#fecdd3';
  const percentDiff = data.targetPrice > 0 ? ((data.currentPrice - data.targetPrice) / data.targetPrice) * 100 : 0;
  
  const formattedCurrent = data.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const formattedTarget = data.targetPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const timeFormatted = new Date(data.triggeredAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fiyat Alarmı Tetiklendi: ${data.code}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; background: rgba(255,255,255,0.15); border-radius: 6px; color: #38bdf8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Borsa & TEFAS Akıllı Takip
                    </span>
                    <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 8px 0 0 0; letter-spacing: -0.5px;">
                      🚨 Fiyat Alarmı Tetiklendi!
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Alert Banner -->
          <tr>
            <td style="padding: 24px 30px 10px 30px;">
              <div style="background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <span style="color: ${directionColor}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${directionText}
                      </span>
                      <div style="font-size: 28px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                        ${data.code} <span style="font-size: 16px; font-weight: 500; color: #64748b;">· ${data.name}</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Price Comparison Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; background-color: #f1f5f9; border-radius: 12px; border-collapse: separate; border-spacing: 0; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-right: 1px solid #e2e8f0; width: 50%;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Güncel Fiyat</div>
                    <div style="font-size: 22px; font-weight: 800; color: ${directionColor}; margin-top: 4px;">
                      ₺${formattedCurrent}
                    </div>
                  </td>
                  <td style="padding: 16px 20px; width: 50%;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Hedef Fiyatınız</div>
                    <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                      ₺${formattedTarget}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Details List -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #334155; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 140px;">Fark Oranı:</td>
                  <td style="padding: 8px 0; font-weight: 700; color: ${directionColor};">
                    ${percentDiff >= 0 ? '+' : ''}%${percentDiff.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Tetiklenme Zamanı:</td>
                  <td style="padding: 8px 0; font-weight: 600;">${timeFormatted} (TSİ)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Varlık Türü:</td>
                  <td style="padding: 8px 0; font-weight: 600;">${data.type === 'stock' ? 'BIST Hisse Senedi' : data.type === 'fund' ? 'TEFAS Yatırım Fonu' : data.type}</td>
                </tr>
                ${data.note ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Alarm Notunuz:</td>
                  <td style="padding: 8px 0; font-style: italic; color: #0f172a;">"${data.note}"</td>
                </tr>
                ` : ''}
              </table>

              <!-- Action button -->
              <div style="text-align: center; margin: 25px 0 15px 0;">
                <a href="https://borsa-tefas.applet" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);">
                  Portföyde Görüntüle
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                Bu bildirim <strong>${recipientEmail}</strong> adresi için Borsa & TEFAS 24/7 Kesintisiz Arka Plan Alarm Motoru tarafından otomatik olarak üretilmiştir.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends price alert trigger notification email
 */
export async function sendAlertEmail(
  recipientEmail: string,
  alertData: EmailAlertData
): Promise<{ success: boolean; delivered: boolean; messageId?: string; error?: string; details?: string }> {
  try {
    const targetEmail = recipientEmail || process.env.NOTIFICATION_EMAIL || 'ykefal@gmail.com';
    const isAbove = alertData.condition === 'above';
    const directionEmoji = isAbove ? '▲' : '▼';
    const subject = `🚨 Fiyat Alarmı: ${alertData.code} ${directionEmoji} ₺${alertData.currentPrice.toLocaleString('tr-TR')} (Hedef: ₺${alertData.targetPrice.toLocaleString('tr-TR')})`;
    const html = generateAlertHtml(alertData, targetEmail);

    const hasSmtpConfig = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

    if (!hasSmtpConfig) {
      console.warn(`[EmailService] SMTP bilgileri eksik (SMTP_USER veya SMTP_PASS tanımlı değil). E-posta sunucu günlüğüne kaydedildi: ${targetEmail} için ${alertData.code}`);
      return {
        success: false,
        delivered: false,
        error: 'SMTP ayarları (SMTP_USER ve SMTP_PASS) henüz yapılandırılmamış.',
        details: 'Gerçek e-posta teslimatı için Settings / Ortam Değişkenleri üzerinden Gmail SMTP veya başka bir e-posta sunucusu tanımlanmalıdır.'
      };
    }

    console.log(`[EmailService] Gerçek SMTP üzerinden ${targetEmail} adresine e-posta gönderiliyor (${alertData.code})...`);

    const client = getEmailTransporter();
    const fromAddress = process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'Borsa & TEFAS Takip'}" <${process.env.SMTP_USER}>`;

    const info = await client.sendMail({
      from: fromAddress,
      to: targetEmail,
      subject,
      html,
      text: `Fiyat Alarmı Tetiklendi: ${alertData.code} (${alertData.name}) hedef fiyata ulaştı! Güncel Fiyat: ₺${alertData.currentPrice}, Hedef: ₺${alertData.targetPrice}. Zaman: ${alertData.triggeredAt}`
    });

    console.log(`[EmailService] E-posta başarıyla iletildi: ${info.messageId}`);
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[EmailService] E-posta gönderme hatası:', err);
    return { success: false, delivered: false, error: err.message || 'E-posta gönderiminde hata oluştu' };
  }
}

/**
 * Sends a test verification email to confirm email notifications are working
 */
export async function sendTestEmail(
  recipientEmail: string
): Promise<{ success: boolean; delivered: boolean; message?: string; error?: string; details?: string }> {
  try {
    const targetEmail = recipientEmail || 'ykefal@gmail.com';
    const testData: EmailAlertData = {
      code: 'THYAO',
      name: 'Türk Hava Yolları A.O.',
      type: 'stock',
      condition: 'above',
      targetPrice: 320.00,
      currentPrice: 325.50,
      initialPrice: 310.00,
      triggeredAt: new Date().toISOString(),
      note: 'Test E-Posta Bildirimi - 24/7 Arka Plan Takibi Aktif!'
    };

    const result = await sendAlertEmail(targetEmail, testData);
    if (result.success && result.delivered) {
      return {
        success: true,
        delivered: true,
        message: `${targetEmail} adresine test alarm e-postası başarıyla ulaştı.`
      };
    } else {
      return {
        success: false,
        delivered: false,
        error: result.error || 'E-posta gönderilemedi.',
        details: result.details
      };
    }
  } catch (err: any) {
    return { success: false, delivered: false, error: err.message };
  }
}
