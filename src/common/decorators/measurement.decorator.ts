import { Column } from 'typeorm';

export const MeasurementColumn = () => Column({ type: 'decimal', precision: 5, scale: 2 });