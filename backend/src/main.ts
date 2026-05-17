import 'reflect-metadata';
import { types } from 'pg';
// Return DATE columns as plain strings (YYYY-MM-DD) instead of JavaScript Date objects
types.setTypeParser(1082, (val: string) => val);
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads', 'leave-attachments');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files as static assets
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CheckPass API')
    .setDescription('CheckPass 打卡通 — Attendance & HR Management System API')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('auth', 'Authentication & Authorization')
    .addTag('attendance', 'Attendance Check-In / Check-Out')
    .addTag('shift', 'Shift Scheduling')
    .addTag('leave', 'Leave Requests & Approvals')
    .addTag('payroll', 'Payroll Calculation & Management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  console.log(`CheckPass backend running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
