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
exports.ProjectModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid"); // Ensure you import uuidv4
const creator_model_1 = require("./creator.model");
const media_model_1 = require("./media.model");
const jobApplication_model_1 = require("./jobApplication.model");
const JobApplicationProjects_model_1 = require("./JobApplicationProjects.model");
let ProjectModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "project" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _creatorId_decorators;
    let _creatorId_initializers = [];
    let _creatorId_extraInitializers = [];
    let _creator_decorators;
    let _creator_initializers = [];
    let _creator_extraInitializers = [];
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    let _projectDescription_decorators;
    let _projectDescription_initializers = [];
    let _projectDescription_extraInitializers = [];
    let _jobApplications_decorators;
    let _jobApplications_initializers = [];
    let _jobApplications_extraInitializers = [];
    let _tags_decorators;
    let _tags_initializers = [];
    let _tags_extraInitializers = [];
    let _images_decorators;
    let _images_initializers = [];
    let _images_extraInitializers = [];
    var ProjectModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.creatorId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _creatorId_initializers, void 0));
            this.creator = (__runInitializers(this, _creatorId_extraInitializers), __runInitializers(this, _creator_initializers, void 0));
            this.title = (__runInitializers(this, _creator_extraInitializers), __runInitializers(this, _title_initializers, void 0));
            this.projectDescription = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _projectDescription_initializers, void 0));
            this.jobApplications = (__runInitializers(this, _projectDescription_extraInitializers), __runInitializers(this, _jobApplications_initializers, void 0));
            this.tags = (__runInitializers(this, _jobApplications_extraInitializers), __runInitializers(this, _tags_initializers, void 0));
            this.images = (__runInitializers(this, _tags_extraInitializers), __runInitializers(this, _images_initializers, void 0)); // This will hold multiple media items
            __runInitializers(this, _images_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "ProjectModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [sequelize_typescript_1.PrimaryKey, (0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _creatorId_decorators = [(0, sequelize_typescript_1.ForeignKey)(() => creator_model_1.CreatorModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _creator_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => creator_model_1.CreatorModel, {
                foreignKey: "creatorId",
                as: "creator",
                onDelete: "CASCADE",
            })];
        _title_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _projectDescription_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _jobApplications_decorators = [(0, sequelize_typescript_1.BelongsToMany)(() => jobApplication_model_1.JobApplicationModel, () => JobApplicationProjects_model_1.JobApplicationProjects)];
        _tags_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.JSON)];
        _images_decorators = [(0, sequelize_typescript_1.HasMany)(() => media_model_1.MediaModel, {
                foreignKey: "projectId", // This will link to the project
                as: "media", // More intuitive naming for multiple media items
            })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _creatorId_decorators, { kind: "field", name: "creatorId", static: false, private: false, access: { has: obj => "creatorId" in obj, get: obj => obj.creatorId, set: (obj, value) => { obj.creatorId = value; } }, metadata: _metadata }, _creatorId_initializers, _creatorId_extraInitializers);
        __esDecorate(null, null, _creator_decorators, { kind: "field", name: "creator", static: false, private: false, access: { has: obj => "creator" in obj, get: obj => obj.creator, set: (obj, value) => { obj.creator = value; } }, metadata: _metadata }, _creator_initializers, _creator_extraInitializers);
        __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
        __esDecorate(null, null, _projectDescription_decorators, { kind: "field", name: "projectDescription", static: false, private: false, access: { has: obj => "projectDescription" in obj, get: obj => obj.projectDescription, set: (obj, value) => { obj.projectDescription = value; } }, metadata: _metadata }, _projectDescription_initializers, _projectDescription_extraInitializers);
        __esDecorate(null, null, _jobApplications_decorators, { kind: "field", name: "jobApplications", static: false, private: false, access: { has: obj => "jobApplications" in obj, get: obj => obj.jobApplications, set: (obj, value) => { obj.jobApplications = value; } }, metadata: _metadata }, _jobApplications_initializers, _jobApplications_extraInitializers);
        __esDecorate(null, null, _tags_decorators, { kind: "field", name: "tags", static: false, private: false, access: { has: obj => "tags" in obj, get: obj => obj.tags, set: (obj, value) => { obj.tags = value; } }, metadata: _metadata }, _tags_initializers, _tags_extraInitializers);
        __esDecorate(null, null, _images_decorators, { kind: "field", name: "images", static: false, private: false, access: { has: obj => "images" in obj, get: obj => obj.images, set: (obj, value) => { obj.images = value; } }, metadata: _metadata }, _images_initializers, _images_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProjectModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProjectModel = _classThis;
})();
exports.ProjectModel = ProjectModel;
