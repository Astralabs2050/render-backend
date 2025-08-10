import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../entities/collection.entity';
import { PaymentIntent } from '../entities/payment-intent.entity';
import { ReconciliationJob } from '../entities/reconciliation-job.entity';
import { ThirdwebService } from '../../web3/services/thirdweb.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(PaymentIntent)
    private paymentIntentRepository: Repository<PaymentIntent>,
    @InjectRepository(ReconciliationJob)
    private reconciliationJobRepository: Repository<ReconciliationJob>,
    private thirdwebService: ThirdwebService,
  ) {}

  async reconcileFailedPayments(): Promise<void> {
    this.logger.log('Starting payment reconciliation job');

   
    const pendingJobs = await this.reconciliationJobRepository.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      take: 10 
    });

    for (const job of pendingJobs) {
      try {
        this.logger.log('Processing reconciliation job', {
          jobId: job.id,
          collectionId: job.collectionId,
          transactionHash: job.transactionHash
        });
        
        const collection = await this.collectionRepository.findOne({
          where: { id: job.collectionId }
        });
        
        if (!collection) {
          await this.reconciliationJobRepository.update(job.id, {
            status: 'failed',
            processedAt: new Date()
          });
          continue;
        }
        
        await this.collectionRepository.update(job.collectionId, {
          status: 'paid',
          paymentTransactionHash: job.transactionHash,
          paidAt: new Date(),
          blockchainMetadata: {
            transactionHash: job.transactionHash,
            timestamp: new Date().toISOString(),
            reconciledAt: new Date().toISOString()
          }
        });
        
        await this.paymentIntentRepository.update(
          { collectionId: job.collectionId },
          { status: 'completed' }
        );
        
        await this.reconciliationJobRepository.update(job.id, {
          status: 'completed',
          processedAt: new Date()
        });
        
        this.logger.log('Reconciliation job completed', {
          jobId: job.id,
          collectionId: job.collectionId,
          transactionHash: job.transactionHash
        });
        
      } catch (error) {
        this.logger.error('Reconciliation job failed', {
          jobId: job.id,
          collectionId: job.collectionId,
          error: error.message
        });
        
        await this.reconciliationJobRepository.update(job.id, {
          status: 'failed',
          processedAt: new Date()
        });
      }
    }

    this.logger.log('Payment reconciliation completed', {
      processedJobs: pendingJobs.length
    });
  }
}