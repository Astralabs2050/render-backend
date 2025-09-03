import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import * as fs from 'fs';
@Controller()
export class AppController {
  @Get()
  getHello(@Res() res: Response) {
    const indexPath = process.env.NODE_ENV === 'production' 
      ? join(__dirname, '..', 'public', 'index.html')
      : join(process.cwd(), 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.json({
        message: 'Astra Fashion Backend API',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          auth: '/auth',
          'ai-chat': '/ai-chat',
          web3: '/web3',
          health: '/health'
      },
        testPages: {
          directory: '/',
          complete: '/all-features-test.html',
          comprehensive: '/comprehensive-test.html',
          auth: '/auth-test.html'
        }
      });
    }
  }
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
  }
  @Get('test-files')
  getTestFiles() {
    const publicPath = process.env.NODE_ENV === 'production' 
      ? join(__dirname, '..', 'public')
      : join(process.cwd(), 'public');
    try {
      const files = fs.readdirSync(publicPath);
      return {
        publicPath,
        files: files.filter(file => file.endsWith('.html')),
        exists: fs.existsSync(publicPath)
      };
    } catch (error) {
      return {
        error: error.message,
        publicPath,
        exists: false
      };
    }
  }
}