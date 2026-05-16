import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface SseEvent {
  id?: string;
  type: string;
  data: unknown;
}

@Injectable()
export class SseService {
  private readonly subjects = new Map<number, Subject<MessageEvent>>();

  getStream(employeeId: number): Observable<MessageEvent> {
    if (!this.subjects.has(employeeId)) {
      this.subjects.set(employeeId, new Subject<MessageEvent>());
    }
    return this.subjects.get(employeeId)!.asObservable();
  }

  onDisconnect(employeeId: number): void {
    const subject = this.subjects.get(employeeId);
    if (subject) {
      subject.complete();
      this.subjects.delete(employeeId);
    }
  }

  sendToEmployee(employeeId: number, event: SseEvent): void {
    const subject = this.subjects.get(employeeId);
    if (subject && !subject.closed) {
      subject.next({
        type: event.type,
        data: JSON.stringify({ ...event.data as object, _type: event.type }),
      } as unknown as MessageEvent);
    }
  }

  sendToAll(event: SseEvent): void {
    this.subjects.forEach((subject) => {
      if (!subject.closed) {
        subject.next({
          type: event.type,
          data: JSON.stringify({ ...event.data as object, _type: event.type }),
        } as unknown as MessageEvent);
      }
    });
  }

  activeConnections(): number {
    return this.subjects.size;
  }
}
