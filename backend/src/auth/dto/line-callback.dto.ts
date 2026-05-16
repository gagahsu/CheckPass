import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LineCallbackDto {
  @ApiProperty({
    description: 'Authorization code returned by LINE Login OAuth2 flow',
    example: 'abc123xyz',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
