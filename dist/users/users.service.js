"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const helpers_1 = require("../common/utils/helpers");
let UsersService = UsersService_1 = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async create(createUserDto) {
        const { email, password } = createUserDto;
        const existingUser = await this.usersRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new common_1.ConflictException(`User with email ${email} already exists`);
        }
        const hashedPassword = await helpers_1.Helpers.hashPassword(password);
        const user = this.usersRepository.create({
            ...createUserDto,
            password: hashedPassword,
        });
        const savedUser = await this.usersRepository.save(user);
        this.logger.log(`Created user with ID: ${savedUser.id}`);
        helpers_1.Helpers.logData('New User', helpers_1.Helpers.sanitizeUser(savedUser));
        return savedUser;
    }
    async findAll() {
        const users = await this.usersRepository.find();
        this.logger.log(`Found ${users.length} users`);
        return users;
    }
    async findOne(id) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            this.logger.warn(`User with ID ${id} not found`);
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async findByEmail(email) {
        const user = await this.usersRepository.findOne({ where: { email } });
        if (!user) {
            this.logger.warn(`User with email ${email} not found`);
            throw new common_1.NotFoundException(`User with email ${email} not found`);
        }
        return user;
    }
    async update(id, updateUserDto) {
        const user = await this.findOne(id);
        if (updateUserDto.password) {
            updateUserDto.password = await helpers_1.Helpers.hashPassword(updateUserDto.password);
        }
        Object.assign(user, updateUserDto);
        const updatedUser = await this.usersRepository.save(user);
        this.logger.log(`Updated user with ID: ${id}`);
        return updatedUser;
    }
    async remove(id) {
        const result = await this.usersRepository.delete(id);
        if (result.affected === 0) {
            this.logger.warn(`Failed to delete user with ID ${id} - not found`);
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        this.logger.log(`Deleted user with ID: ${id}`);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map