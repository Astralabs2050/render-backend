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
exports.JobModel = exports.timelineStatus = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid");
const design_model_1 = require("./design.model");
const user_model_1 = require("./user.model");
const jobApplication_model_1 = require("./jobApplication.model");
var timelineStatus;
(function (timelineStatus) {
    timelineStatus["completed"] = "completed";
    timelineStatus["ongoing"] = "ongoing";
})(timelineStatus || (exports.timelineStatus = timelineStatus = {}));
let JobModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "jobs" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _timeline_decorators;
    let _timeline_initializers = [];
    let _timeline_extraInitializers = [];
    let _impression_decorators;
    let _impression_initializers = [];
    let _impression_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _timelineStatus_decorators;
    let _timelineStatus_initializers = [];
    let _timelineStatus_extraInitializers = [];
    let _manufacturer_decorators;
    let _manufacturer_initializers = [];
    let _manufacturer_extraInitializers = [];
    let _makerId_decorators;
    let _makerId_initializers = [];
    let _makerId_extraInitializers = [];
    let _maker_decorators;
    let _maker_initializers = [];
    let _maker_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    let _designId_decorators;
    let _designId_initializers = [];
    let _designId_extraInitializers = [];
    let _design_decorators;
    let _design_initializers = [];
    let _design_extraInitializers = [];
    let _job_decorators;
    let _job_initializers = [];
    let _job_extraInitializers = [];
    var JobModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, (0, uuid_1.v4)());
            this.description = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            this.timeline = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _timeline_initializers, void 0));
            this.impression = (__runInitializers(this, _timeline_extraInitializers), __runInitializers(this, _impression_initializers, void 0));
            this.status = (__runInitializers(this, _impression_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.timelineStatus = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _timelineStatus_initializers, void 0));
            this.manufacturer = (__runInitializers(this, _timelineStatus_extraInitializers), __runInitializers(this, _manufacturer_initializers, void 0));
            this.makerId = (__runInitializers(this, _manufacturer_extraInitializers), __runInitializers(this, _makerId_initializers, void 0));
            this.maker = (__runInitializers(this, _makerId_extraInitializers), __runInitializers(this, _maker_initializers, void 0));
            this.userId = (__runInitializers(this, _maker_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.user = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.designId = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _designId_initializers, void 0));
            this.design = (__runInitializers(this, _designId_extraInitializers), __runInitializers(this, _design_initializers, void 0));
            // Add the HasMany association for MediaModel
            this.job = (__runInitializers(this, _design_extraInitializers), __runInitializers(this, _job_initializers, void 0));
            __runInitializers(this, _job_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "JobModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [(0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _description_decorators = [(0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT)];
        _timeline_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        _impression_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Default)(0), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _status_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _timelineStatus_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(timelineStatus)))];
        _manufacturer_decorators = [(0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _makerId_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _maker_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "makerId",
                as: "maker", // Define the alias for this association
                onDelete: "SET NULL", // Optional, based on your requirements
            })];
        _userId_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _user_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "userId",
                as: "user",
                onDelete: "CASCADE",
            })];
        _designId_decorators = [(0, sequelize_typescript_1.ForeignKey)(() => design_model_1.DesignModel), (0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _design_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => design_model_1.DesignModel, {
                foreignKey: "designId",
                as: "design",
                onDelete: "CASCADE",
            })];
        _job_decorators = [(0, sequelize_typescript_1.HasMany)(() => jobApplication_model_1.JobApplicationModel, {
                foreignKey: "jobId", // Reference to the user's id in the MediaModel
                as: "job", // Alias for the media association
            })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _timeline_decorators, { kind: "field", name: "timeline", static: false, private: false, access: { has: obj => "timeline" in obj, get: obj => obj.timeline, set: (obj, value) => { obj.timeline = value; } }, metadata: _metadata }, _timeline_initializers, _timeline_extraInitializers);
        __esDecorate(null, null, _impression_decorators, { kind: "field", name: "impression", static: false, private: false, access: { has: obj => "impression" in obj, get: obj => obj.impression, set: (obj, value) => { obj.impression = value; } }, metadata: _metadata }, _impression_initializers, _impression_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _timelineStatus_decorators, { kind: "field", name: "timelineStatus", static: false, private: false, access: { has: obj => "timelineStatus" in obj, get: obj => obj.timelineStatus, set: (obj, value) => { obj.timelineStatus = value; } }, metadata: _metadata }, _timelineStatus_initializers, _timelineStatus_extraInitializers);
        __esDecorate(null, null, _manufacturer_decorators, { kind: "field", name: "manufacturer", static: false, private: false, access: { has: obj => "manufacturer" in obj, get: obj => obj.manufacturer, set: (obj, value) => { obj.manufacturer = value; } }, metadata: _metadata }, _manufacturer_initializers, _manufacturer_extraInitializers);
        __esDecorate(null, null, _makerId_decorators, { kind: "field", name: "makerId", static: false, private: false, access: { has: obj => "makerId" in obj, get: obj => obj.makerId, set: (obj, value) => { obj.makerId = value; } }, metadata: _metadata }, _makerId_initializers, _makerId_extraInitializers);
        __esDecorate(null, null, _maker_decorators, { kind: "field", name: "maker", static: false, private: false, access: { has: obj => "maker" in obj, get: obj => obj.maker, set: (obj, value) => { obj.maker = value; } }, metadata: _metadata }, _maker_initializers, _maker_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _designId_decorators, { kind: "field", name: "designId", static: false, private: false, access: { has: obj => "designId" in obj, get: obj => obj.designId, set: (obj, value) => { obj.designId = value; } }, metadata: _metadata }, _designId_initializers, _designId_extraInitializers);
        __esDecorate(null, null, _design_decorators, { kind: "field", name: "design", static: false, private: false, access: { has: obj => "design" in obj, get: obj => obj.design, set: (obj, value) => { obj.design = value; } }, metadata: _metadata }, _design_initializers, _design_extraInitializers);
        __esDecorate(null, null, _job_decorators, { kind: "field", name: "job", static: false, private: false, access: { has: obj => "job" in obj, get: obj => obj.job, set: (obj, value) => { obj.job = value; } }, metadata: _metadata }, _job_initializers, _job_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        JobModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return JobModel = _classThis;
})();
exports.JobModel = JobModel;
