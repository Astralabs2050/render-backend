import { BaseEntity } from '../../common/entities/base.entity';
export declare class Waitlist extends BaseEntity {
    fullName: string;
    email: string;
    phoneNumber: string;
    whatYouMake: string;
    website: string;
    location: string;
    approved: boolean;
    invited: boolean;
}
