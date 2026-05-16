import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO for submitting a leave application */
export class ApplyLeaveDto {
  @ApiProperty({ description: 'Leave type ID', example: 1 })
  @IsNumber()
  leaveTypeId: number;

  @ApiProperty({
    description: 'Leave start date (inclusive) in YYYY-MM-DD format',
    example: '2026-06-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Leave end date (inclusive) in YYYY-MM-DD format',
    example: '2026-06-03',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Reason for leave',
    example: 'Family vacation',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/** DTO for manager approval / rejection response */
export class ApproveLeaveDto {
  @ApiPropertyOptional({
    description: 'Optional comment from the approver',
    example: 'Approved. Enjoy your vacation!',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectLeaveDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Insufficient coverage during that period.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
