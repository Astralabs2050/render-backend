import { Repository } from 'typeorm';
import { Waitlist } from './entities/waitlist.entity';
import { JoinWaitlistDto } from './dto/waitlist.dto';
export declare class WaitlistService {
    private waitlistRepository;
    private readonly logger;
    constructor(waitlistRepository: Repository<Waitlist>);
    join(joinWaitlistDto: JoinWaitlistDto): Promise<Waitlist>;
}
