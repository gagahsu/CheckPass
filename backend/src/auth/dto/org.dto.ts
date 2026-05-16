import { IsString, IsOptional, IsNumber, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() managerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() parentId?: number;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() managerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() parentId?: number;
}

export class CreatePositionDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() departmentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) level?: number;
}

export class UpdatePositionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() departmentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) level?: number;
}
