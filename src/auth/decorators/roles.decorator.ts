import { SetMetadata } from '@nestjs/common';
import { UserType } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../guards/role.guard';
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);