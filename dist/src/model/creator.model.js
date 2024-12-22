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
exports.CreatorModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const user_model_1 = require("./user.model");
const workExperience_model_1 = require("./workExperience.model");
const project_model_1 = require("./project.model");
const uuid_1 = require("uuid");
var creatorType;
(function (creatorType) {
    creatorType["digital"] = "digital";
    creatorType["physical"] = "physical";
})(creatorType || (creatorType = {}));
let CreatorModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "creators" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    let _fullName_decorators;
    let _fullName_initializers = [];
    let _fullName_extraInitializers = [];
    let _location_decorators;
    let _location_initializers = [];
    let _location_extraInitializers = [];
    let _category_decorators;
    let _category_initializers = [];
    let _category_extraInitializers = [];
    let _skills_decorators;
    let _skills_initializers = [];
    let _skills_extraInitializers = [];
    let _creatorType_decorators;
    let _creatorType_initializers = [];
    let _creatorType_extraInitializers = [];
    let _workExperiences_decorators;
    let _workExperiences_initializers = [];
    let _workExperiences_extraInitializers = [];
    let _projects_decorators;
    let _projects_initializers = [];
    let _projects_extraInitializers = [];
    var CreatorModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.userId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.user = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.fullName = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _fullName_initializers, void 0));
            this.location = (__runInitializers(this, _fullName_extraInitializers), __runInitializers(this, _location_initializers, void 0));
            this.category = (__runInitializers(this, _location_extraInitializers), __runInitializers(this, _category_initializers, void 0));
            this.skills = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _skills_initializers, void 0));
            this.creatorType = (__runInitializers(this, _skills_extraInitializers), __runInitializers(this, _creatorType_initializers, void 0));
            this.workExperiences = (__runInitializers(this, _creatorType_extraInitializers), __runInitializers(this, _workExperiences_initializers, void 0));
            this.projects = (__runInitializers(this, _workExperiences_extraInitializers), __runInitializers(this, _projects_initializers, void 0));
            __runInitializers(this, _projects_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "CreatorModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [(0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _userId_decorators = [(0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _user_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "userId",
                as: "user",
                onDelete: "CASCADE", // Ensure cascade delete
            })];
        _fullName_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _location_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _category_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.JSON)];
        _skills_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.JSON)];
        _creatorType_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(creatorType)))];
        _workExperiences_decorators = [(0, sequelize_typescript_1.HasMany)(() => workExperience_model_1.WorkExperienceModel, {
                foreignKey: "creatorId",
                as: "workExperiences",
                onDelete: "CASCADE", // Ensure cascade delete
            })];
        _projects_decorators = [(0, sequelize_typescript_1.HasMany)(() => project_model_1.ProjectModel, {
                foreignKey: "creatorId",
                as: "projects", // Use consistent alias
                onDelete: "CASCADE", // Ensure cascade delete
            })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _fullName_decorators, { kind: "field", name: "fullName", static: false, private: false, access: { has: obj => "fullName" in obj, get: obj => obj.fullName, set: (obj, value) => { obj.fullName = value; } }, metadata: _metadata }, _fullName_initializers, _fullName_extraInitializers);
        __esDecorate(null, null, _location_decorators, { kind: "field", name: "location", static: false, private: false, access: { has: obj => "location" in obj, get: obj => obj.location, set: (obj, value) => { obj.location = value; } }, metadata: _metadata }, _location_initializers, _location_extraInitializers);
        __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: obj => "category" in obj, get: obj => obj.category, set: (obj, value) => { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
        __esDecorate(null, null, _skills_decorators, { kind: "field", name: "skills", static: false, private: false, access: { has: obj => "skills" in obj, get: obj => obj.skills, set: (obj, value) => { obj.skills = value; } }, metadata: _metadata }, _skills_initializers, _skills_extraInitializers);
        __esDecorate(null, null, _creatorType_decorators, { kind: "field", name: "creatorType", static: false, private: false, access: { has: obj => "creatorType" in obj, get: obj => obj.creatorType, set: (obj, value) => { obj.creatorType = value; } }, metadata: _metadata }, _creatorType_initializers, _creatorType_extraInitializers);
        __esDecorate(null, null, _workExperiences_decorators, { kind: "field", name: "workExperiences", static: false, private: false, access: { has: obj => "workExperiences" in obj, get: obj => obj.workExperiences, set: (obj, value) => { obj.workExperiences = value; } }, metadata: _metadata }, _workExperiences_initializers, _workExperiences_extraInitializers);
        __esDecorate(null, null, _projects_decorators, { kind: "field", name: "projects", static: false, private: false, access: { has: obj => "projects" in obj, get: obj => obj.projects, set: (obj, value) => { obj.projects = value; } }, metadata: _metadata }, _projects_initializers, _projects_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CreatorModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CreatorModel = _classThis;
})();
exports.CreatorModel = CreatorModel;
