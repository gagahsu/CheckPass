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
