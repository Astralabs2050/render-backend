import { IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
class WorkExperienceDto {
  @IsString()
  @IsNotEmpty()
  employerName: string;
  @IsString()
  @IsNotEmpty()
  jobTitle: string;
  @IsString()
  @IsNotEmpty()
  startMonth: string;
  @IsString()
  @IsNotEmpty()
  startYear: string;
  @IsString()
  @IsNotEmpty()
  endMonth: string;
  @IsString()
  @IsNotEmpty()
  endYear: string;
  @IsString()
  @IsNotEmpty()
  jobDescription: string;
}
class ProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;
  @IsString()
  @IsNotEmpty()
  description: string;
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tags: string[];
  images?: string[];
}
export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  location: string;
  @IsString()
  @IsNotEmpty()
  category: string;
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  skills: string[];
  @IsOptional()
  @IsString()
  nameOnId?: string;
  @IsOptional()
  @IsString()
  idCountryOfIssue?: string;
  @IsOptional()
  @IsDateString()
  idExpiryDate?: string;
  @IsOptional()
  @IsString()
  businessName?: string;
  @IsOptional()
  @IsString()
  businessCountryOfRegistration?: string;
  @IsOptional()
  @IsString()
  businessType?: string;
  @IsOptional()
  @IsString()
  taxRegistrationNumber?: string;
  governmentIdImages?: string[];
  businessCertificateImage?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  workExperience?: WorkExperienceDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];
}