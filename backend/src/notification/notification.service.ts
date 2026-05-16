import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface LineTextMessage {
  type: 'text';
  text: string;
}

interface LinePushPayload {
  to: string;
  messages: LineTextMessage[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly lineApiUrl = 'https://api.line.me/v2/bot/message/push';

  constructor(private readonly configService: ConfigService) {}

  async sendLinePush(lineUserId: string, text: string): Promise<void> {
    const token = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN', '');
    if (!token) {
      this.logger.warn('LINE_CHANNEL_ACCESS_TOKEN not set — skipping LINE push');
      return;
    }

    const payload: LinePushPayload = {
      to: lineUserId,
      messages: [{ type: 'text', text }],
    };

    try {
      await axios.post(this.lineApiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err: unknown) {
      this.logger.error(`Failed to send LINE push to ${lineUserId}`, err);
    }
  }

  buildCheckInMessage(name: string, time: Date, status: string): string {
    const timeStr = this.formatTime(time);
    const statusLabel = status === 'late' ? '⚠️ 遲到' : '✅ 準時';
    return `${name} 您好！\n上班打卡成功 ${statusLabel}\n時間：${timeStr}`;
  }

  buildCheckOutMessage(name: string, time: Date, overtimeHours: number): string {
    const timeStr = this.formatTime(time);
    const overtimeText =
      overtimeHours > 0 ? `\n加班：${overtimeHours.toFixed(1)} 小時` : '';
    return `${name} 您好！\n下班打卡成功 ✅\n時間：${timeStr}${overtimeText}`;
  }

  buildLeaveResultMessage(name: string, leaveType: string, approved: boolean): string {
    const result = approved ? '✅ 已核准' : '❌ 已拒絕';
    return `${name} 您好！\n您的${leaveType}申請 ${result}`;
  }

  buildWelcomeLinePush(name: string, empNo: string): string {
    return `歡迎加入！🎉\n${name} 您好，您的 CheckPass 帳號已開立。\n員工編號：${empNo}\n請透過 LINE 登入系統查看班表與打卡記錄。`;
  }

  buildWelcomeEmail(name: string, empNo: string, appUrl: string): string {
    return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0284c7">歡迎使用 CheckPass 打卡通 🎉</h2>
      <p>${name} 您好，</p>
      <p>您的帳號已由 HR 建立，以下為您的帳號資訊：</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f3f4f6">
          <td style="padding:8px 12px;font-weight:700">項目</td>
          <td style="padding:8px 12px;font-weight:700">內容</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-top:1px solid #e5e7eb">姓名</td>
          <td style="padding:8px 12px;border-top:1px solid #e5e7eb">${name}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-top:1px solid #e5e7eb">員工編號</td>
          <td style="padding:8px 12px;border-top:1px solid #e5e7eb">${empNo}</td>
        </tr>
      </table>
      <p>請至以下網址，使用 LINE 帳號登入系統：</p>
      <p style="margin:16px 0">
        <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0284c7);color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700">前往登入</a>
      </p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:0.8em">此郵件由 CheckPass 打卡通自動發送，請勿直接回覆。</p>
    </div>`;
  }

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    const apiKey = this.configService.get<string>('MAILJET_API_KEY', '');
    const secretKey = this.configService.get<string>('MAILJET_SECRET_KEY', '');
    const fromEmail = this.configService.get<string>('MAILJET_FROM_EMAIL', 'noreply@checkpass.app');
    const fromName = this.configService.get<string>('MAILJET_FROM_NAME', 'CheckPass 打卡通');

    if (!apiKey || !secretKey) {
      this.logger.warn('MAILJET_API_KEY/SECRET not set — skipping email');
      return;
    }

    try {
      await axios.post(
        'https://api.mailjet.com/v3.1/send',
        {
          Messages: [{
            From: { Email: fromEmail, Name: fromName },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: htmlBody,
          }],
        },
        {
          auth: { username: apiKey, password: secretKey },
          headers: { 'Content-Type': 'application/json' },
        },
      );
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err: unknown) {
      this.logger.error(`Failed to send email to ${to}`, err);
    }
  }

  buildPayrollEmail(name: string, year: number, month: number, payroll: {
    baseSalary: number; overtimePay: number; deduction: number; totalSalary: number;
    workingDays: number; overtimeHours: number; lateMinutes: number;
  }): string {
    return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0284c7">CheckPass 薪資通知</h2>
      <p>${name} 您好，</p>
      <p>${year} 年 ${month} 月薪資已確認，以下為您的薪資明細：</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f3f4f6"><td style="padding:8px 12px;font-weight:700">項目</td><td style="padding:8px 12px;font-weight:700;text-align:right">金額（TWD）</td></tr>
        <tr><td style="padding:8px 12px;border-top:1px solid #e5e7eb">基本薪資</td><td style="padding:8px 12px;text-align:right;border-top:1px solid #e5e7eb">${Number(payroll.baseSalary).toLocaleString()}</td></tr>
        <tr><td style="padding:8px 12px;border-top:1px solid #e5e7eb">加班費</td><td style="padding:8px 12px;text-align:right;border-top:1px solid #e5e7eb">+${Number(payroll.overtimePay).toLocaleString()}</td></tr>
        <tr><td style="padding:8px 12px;border-top:1px solid #e5e7eb">扣款（勞健保）</td><td style="padding:8px 12px;text-align:right;border-top:1px solid #e5e7eb;color:#dc2626">-${Number(payroll.deduction).toLocaleString()}</td></tr>
        <tr style="background:#f0fdf4"><td style="padding:8px 12px;font-weight:700;border-top:2px solid #059669">實領金額</td><td style="padding:8px 12px;text-align:right;font-weight:700;font-size:1.1em;color:#059669;border-top:2px solid #059669">NT$ ${Number(payroll.totalSalary).toLocaleString()}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:0.85em">出勤天數：${payroll.workingDays} 天 ｜ 加班時數：${Number(payroll.overtimeHours).toFixed(1)} h ｜ 遲到：${payroll.lateMinutes} 分</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:0.8em">此郵件由 CheckPass 打卡通自動發送，請勿直接回覆。</p>
    </div>
  `;
  }

  private formatTime(date: Date): string {
    return date.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
