import { IsOptional, IsString, IsDateString, IsIn, IsArray, IsNotEmpty, IsEmail, MaxLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: '王小明' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'wang@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '2026-05-16' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ enum: ['employee', 'manager', 'hr', 'admin'], isArray: true, example: ['employee'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleNames?: string[];
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'resigned'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'resigned'])
  status?: string;
}

export class AssignRolesDto {
  @ApiProperty({ type: [String], example: ['employee', 'manager'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  roleNames: string[];
}
