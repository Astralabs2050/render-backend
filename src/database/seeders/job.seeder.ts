import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus, JobPriority } from '../../marketplace/entities/job.entity';
import { JobApplication, ApplicationStatus } from '../../marketplace/entities/job-application.entity';
import { User, UserType } from '../../users/entities/user.entity';

@Injectable()
export class JobSeeder {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async seed() {
    // Find or create users
    let creator = await this.userRepository.findOne({ where: { email: 'creator@example.com' } });
    let maker = await this.userRepository.findOne({ where: { email: 'samueladelowo3@gmail.com' } });

    if (!creator) {
      creator = this.userRepository.create({
        email: 'creator@example.com',
        password: '$2b$10$hash',
        fullName: 'Jane Creator',
        userType: UserType.CREATOR,
        brandName: 'Fashion House Ltd',
        location: 'Lagos, Nigeria'
      });
      creator = await this.userRepository.save(creator);
    }

    if (!maker) {
      console.log('Maker user not found. Please ensure samueladelowo3@gmail.com exists and is a MAKER user.');
      return;
    }
    
    if (maker.userType !== UserType.MAKER) {
      console.log('User exists but is not a MAKER. Updating user type...');
      maker.userType = UserType.MAKER;
      maker = await this.userRepository.save(maker);
    }

    // Create 60 dummy jobs with different statuses
    const jobTitles = [
      'Summer Collection Design', 'Wedding Dress Design', 'Corporate Uniform Design',
      'Evening Gown Collection', 'Casual Wear Line', 'Sports Apparel Design',
      'Children Clothing Line', 'Vintage Style Dresses', 'Modern Suit Design',
      'Beach Wear Collection', 'Winter Coat Design', 'Formal Wear Series',
      'Street Style Outfits', 'Bohemian Fashion Line', 'Minimalist Wardrobe',
      'Party Dress Collection', 'Business Casual Wear', 'Ethnic Fusion Designs',
      'Sustainable Fashion Line', 'Luxury Evening Wear', 'Maternity Clothing',
      'Plus Size Collection', 'Teen Fashion Line', 'Activewear Design',
      'Accessories Collection', 'Bridal Collection', 'Resort Wear Line',
      'Denim Collection', 'Leather Goods Design', 'Footwear Collection',
      'Handbag Series', 'Jewelry Design', 'Swimwear Line', 'Lingerie Collection',
      'Men\'s Formal Wear', 'Women\'s Blazer Line', 'Knitwear Collection',
      'Outerwear Design', 'Festival Fashion', 'Workwear Collection',
      'Athleisure Line', 'Vintage Revival', 'Eco-Friendly Fashion',
      'Luxury Scarves', 'Designer Belts', 'Custom Embroidery',
      'Print Design Series', 'Color Block Collection', 'Geometric Patterns',
      'Floral Print Line', 'Abstract Art Fashion', 'Minimalist Jewelry',
      'Statement Pieces', 'Capsule Wardrobe', 'Travel Wear Collection',
      'Office Attire Line', 'Weekend Casual', 'Date Night Outfits',
      'Red Carpet Gowns', 'Cocktail Dress Series', 'Prom Dress Collection'
    ];

    const statuses = [JobStatus.OPEN, JobStatus.IN_PROGRESS, JobStatus.COMPLETED, JobStatus.CANCELLED];
    const priorities = [JobPriority.LOW, JobPriority.MEDIUM, JobPriority.HIGH, JobPriority.URGENT];
    const appStatuses = [ApplicationStatus.PENDING, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN];

    const jobs = jobTitles.map((title, index) => {
      // More completed jobs for earnings data (70% completed, 15% in_progress, 10% open, 5% cancelled)
      let status;
      if (index < 42) status = JobStatus.COMPLETED;
      else if (index < 51) status = JobStatus.IN_PROGRESS;
      else if (index < 57) status = JobStatus.OPEN;
      else status = JobStatus.CANCELLED;
      
      const isAssigned = status === JobStatus.IN_PROGRESS || status === JobStatus.COMPLETED;
      const daysAgo = Math.floor(Math.random() * 180) + 1; // Random 1-180 days ago
      const acceptedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const completedDate = status === JobStatus.COMPLETED ? 
        new Date(acceptedDate.getTime() + (Math.floor(Math.random() * 30) + 1) * 24 * 60 * 60 * 1000) : null;
      
      return {
        title,
        description: `Professional ${title.toLowerCase()} needed. High quality work required.`,
        budget: 300 + Math.floor(Math.random() * 2000), // Random budget 300-2300
        status,
        priority: priorities[index % priorities.length],
        deadline: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000),
        tags: ['Fashion Design', 'Custom Work'],
        creatorId: creator.id,
        creator,
        ...(isAssigned && {
          makerId: maker.id,
          maker,
          acceptedAt: acceptedDate
        }),
        ...(completedDate && {
          completedAt: completedDate
        })
      };
    });

    for (const jobData of jobs) {
      const existingJob = await this.jobRepository.findOne({ where: { title: jobData.title } });
      if (!existingJob) {
        const job = this.jobRepository.create(jobData);
        await this.jobRepository.save(job);
      }
    }

    // Create applications for various jobs (more applications for richer data)
    const allJobs = await this.jobRepository.find({ relations: ['creator'] });
    
    for (let i = 0; i < Math.min(35, allJobs.length); i++) {
      const job = allJobs[i];
      const existingApp = await this.applicationRepository.findOne({
        where: { jobId: job.id, makerId: maker.id }
      });

      if (!existingApp) {
        let appStatus;
        // More accepted applications for completed jobs
        if (job.status === JobStatus.COMPLETED || job.status === JobStatus.IN_PROGRESS) {
          appStatus = ApplicationStatus.ACCEPTED;
        } else {
          appStatus = appStatuses[i % appStatuses.length];
        }
        
        const application = this.applicationRepository.create({
          jobId: job.id,
          makerId: maker.id,
          job,
          maker,
          coverLetter: `Application for ${job.title}. I have ${Math.floor(Math.random() * 5) + 1} years of relevant experience.`,
          proposedBudget: job.budget,
          proposedTimeline: 7 + (i % 21),
          status: appStatus,
          ...(appStatus !== ApplicationStatus.PENDING && {
            respondedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
          })
        });
        await this.applicationRepository.save(application);
      }
    }

    console.log(`Job seeder completed! Created ${jobTitles.length} jobs with earnings data.`);
    
    // Log summary for verification
    const summary = await this.jobRepository.createQueryBuilder('job')
      .select('job.status, COUNT(*) as count')
      .where('job.makerId = :makerId', { makerId: maker.id })
      .groupBy('job.status')
      .getRawMany();
    
    console.log('Job status summary for maker:', summary);
  }
}