"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobApplicationModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid");
const job_model_1 = require("./job.model");
const user_model_1 = require("./user.model");
const project_model_1 = require("./project.model");
const JobApplicationProjects_model_1 = require("./JobApplicationProjects.model");
let JobApplicationModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "job_applications" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _jobId_decorators;
    let _jobId_initializers = [];
    let _jobId_extraInitializers = [];
    let _job_decorators;
    let _job_initializers = [];
    let _job_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _amount_decorators;
    let _amount_initializers = [];
    let _amount_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _negotiation_decorators;
    let _negotiation_initializers = [];
    let _negotiation_extraInitializers = [];
    let _wallet_decorators;
    let _wallet_initializers = [];
    let _wallet_extraInitializers = [];
    let _minAmount_decorators;
    let _minAmount_initializers = [];
    let _minAmount_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    let _projects_decorators;
    let _projects_initializers = [];
    let _projects_extraInitializers = [];
    var JobApplicationModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, (0, uuid_1.v4)());
            this.jobId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _jobId_initializers, void 0));
            this.job = (__runInitializers(this, _jobId_extraInitializers), __runInitializers(this, _job_initializers, void 0));
            this.userId = (__runInitializers(this, _job_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.amount = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _amount_initializers, void 0));
            this.status = (__runInitializers(this, _amount_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.negotiation = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _negotiation_initializers, void 0));
            this.wallet = (__runInitializers(this, _negotiation_extraInitializers), __runInitializers(this, _wallet_initializers, void 0));
            this.minAmount = (__runInitializers(this, _wallet_extraInitializers), __runInitializers(this, _minAmount_initializers, void 0));
            this.user = (__runInitializers(this, _minAmount_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            // Define the many-to-many relationship with Project
            this.projects = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _projects_initializers, void 0));
            __runInitializers(this, _projects_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "JobApplicationModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [(0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _jobId_decorators = [(0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.ForeignKey)(() => job_model_1.JobModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _job_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => job_model_1.JobModel, {
                foreignKey: "jobId",
                as: "job",
                onDelete: "CASCADE",
            })];
        _userId_decorators = [(0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _amount_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _status_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _negotiation_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _wallet_decorators = [(0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT)];
        _minAmount_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _user_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "userId",
                as: "user",
                onDelete: "CASCADE",
            })];
        _projects_decorators = [(0, sequelize_typescript_1.BelongsToMany)(() => project_model_1.ProjectModel, () => JobApplicationProjects_model_1.JobApplicationProjects)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _jobId_decorators, { kind: "field", name: "jobId", static: false, private: false, access: { has: obj => "jobId" in obj, get: obj => obj.jobId, set: (obj, value) => { obj.jobId = value; } }, metadata: _metadata }, _jobId_initializers, _jobId_extraInitializers);
        __esDecorate(null, null, _job_decorators, { kind: "field", name: "job", static: false, private: false, access: { has: obj => "job" in obj, get: obj => obj.job, set: (obj, value) => { obj.job = value; } }, metadata: _metadata }, _job_initializers, _job_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _amount_decorators, { kind: "field", name: "amount", static: false, private: false, access: { has: obj => "amount" in obj, get: obj => obj.amount, set: (obj, value) => { obj.amount = value; } }, metadata: _metadata }, _amount_initializers, _amount_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _negotiation_decorators, { kind: "field", name: "negotiation", static: false, private: false, access: { has: obj => "negotiation" in obj, get: obj => obj.negotiation, set: (obj, value) => { obj.negotiation = value; } }, metadata: _metadata }, _negotiation_initializers, _negotiation_extraInitializers);
        __esDecorate(null, null, _wallet_decorators, { kind: "field", name: "wallet", static: false, private: false, access: { has: obj => "wallet" in obj, get: obj => obj.wallet, set: (obj, value) => { obj.wallet = value; } }, metadata: _metadata }, _wallet_initializers, _wallet_extraInitializers);
        __esDecorate(null, null, _minAmount_decorators, { kind: "field", name: "minAmount", static: false, private: false, access: { has: obj => "minAmount" in obj, get: obj => obj.minAmount, set: (obj, value) => { obj.minAmount = value; } }, metadata: _metadata }, _minAmount_initializers, _minAmount_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _projects_decorators, { kind: "field", name: "projects", static: false, private: false, access: { has: obj => "projects" in obj, get: obj => obj.projects, set: (obj, value) => { obj.projects = value; } }, metadata: _metadata }, _projects_initializers, _projects_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        JobApplicationModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return JobApplicationModel = _classThis;
})();
exports.JobApplicationModel = JobApplicationModel;
